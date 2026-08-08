"""
Decision synthesis (V2 pivot): reframes the raw generated answer as a
decision record - what the evidence supports doing, how confident that
recommendation actually is in plain language, and what single thing would
change it - instead of leaving the user to mentally combine the answer text
with a separate trust score themselves.

This is deliberately NOT a new fact-generation step: it's a synthesis pass
over data that already exists (the answer text, the verified claims, the
computed trust score). It can only summarize/downgrade confidence, never
invent new claims - the prompt is constrained to that, and a heuristic
fallback (same honesty-under-failure pattern as the rest of this package)
kicks in if the model call fails.
"""

import json
import re

from pydantic import BaseModel

from app.routing.llm_clients import GeminiClient

_PROMPT = """You are summarizing an AI-generated answer as a decision record for someone deciding \
whether to act on it. Respond with ONLY a JSON object (no markdown fences, no commentary) with these \
exact keys:
- "recommendation": one plain sentence stating what the evidence supports (e.g. "Based on this, it's reasonable to..."). Do not add new facts beyond what's in the answer.
- "confidence_phrase": a short, plain-language phrase (NOT a percentage or number) describing how sure this is, calibrated to the trust score given - e.g. "fairly confident, but worth a second check", "solidly supported", "shaky - treat as a starting point, not an answer".
- "key_caveat": one sentence naming the single most important thing that could change this (e.g. a specific unverified claim, or "no independent sources confirmed this").

If the answer itself says information wasn't found or the question can't be answered from available \
context, confidence_phrase must reflect that the ANSWER IS UNHELPFUL (e.g. "no usable answer - try \
rephrasing or adding a source"), even if the trust score is high for correctly saying "I don't know."

Question: {query_text}
Answer: {answer_text}
Overall trust score (0-1, already computed - calibrate confidence_phrase to this, don't invent your own): {overall_trust}
Unsupported or weak claims in the answer: {weak_claims}

JSON:"""


class DecisionRecord(BaseModel):
    recommendation: str
    confidence_phrase: str
    key_caveat: str


def _extract_json(raw: str) -> dict:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in model response")
    return json.loads(match.group(0))


def _confidence_phrase(overall_trust: float) -> str:
    if overall_trust >= 0.8:
        return "solidly supported by what was checked"
    if overall_trust >= 0.6:
        return "reasonably confident, but worth a quick check on the details"
    if overall_trust >= 0.4:
        return "mixed support - treat this as a starting point, not a final answer"
    return "weakly supported - verify independently before acting on this"


def _heuristic_fallback(overall_trust: float, weak_claim_texts: list[str]) -> DecisionRecord:
    caveat = (
        f'The claim "{weak_claim_texts[0][:100]}" could not be independently confirmed.'
        if weak_claim_texts
        else "No independent sources were available to cross-check this answer."
    )
    return DecisionRecord(
        recommendation="Review the full answer below before acting on it.",
        confidence_phrase=_confidence_phrase(overall_trust),
        key_caveat=caveat,
    )


async def synthesize_decision(
    query_text: str, answer_text: str, overall_trust: float, weak_claim_texts: list[str]
) -> DecisionRecord:
    fallback = _heuristic_fallback(overall_trust, weak_claim_texts)

    try:
        client = GeminiClient()
        prompt = _PROMPT.format(
            query_text=query_text,
            answer_text=answer_text,
            overall_trust=round(overall_trust, 2),
            weak_claims="; ".join(weak_claim_texts[:3]) or "none",
        )
        raw = await client.generate(prompt, large=False)
        data = _extract_json(raw)
        return DecisionRecord(
            recommendation=str(data.get("recommendation") or "").strip() or fallback.recommendation,
            confidence_phrase=str(data.get("confidence_phrase") or "").strip() or fallback.confidence_phrase,
            key_caveat=str(data.get("key_caveat") or "").strip() or fallback.key_caveat,
        )
    except Exception:
        return fallback
