"""
Query Understanding (F2): "I believe you are asking..." - restates the
question, pulls out key entities, and flags missing information / plausible
alternative readings, so the user can correct a misread before generation
even starts. This is a real LLM call (not fabricated heuristics dressed up
as understanding), with a heuristic fallback if the model returns malformed
JSON, and canned data in Demo Mode so it never depends on a live key.
"""

import json
import re

from pydantic import BaseModel

from app.core.config import get_settings
from app.demo.scenarios import find_scenario_for_query
from app.routing.llm_clients import GeminiClient

_PROMPT = """Analyze this user question and respond with ONLY a JSON object \
(no markdown fences, no commentary) with these exact keys:
- "intent_summary": one sentence restating what the user is asking, starting with a lowercase verb phrase (e.g. "asking whether...")
- "entities": array of up to 5 key terms/subjects in the question (strings)
- "missing_information": array of up to 2 short phrases describing information that would help answer this more precisely (empty array if the question is already clear)
- "alternative_interpretations": array of up to 2 short phrases describing other plausible ways to read this question (empty array if it's unambiguous)

Question: {query_text}

JSON:"""


class QueryUnderstanding(BaseModel):
    intent_summary: str
    entities: list[str]
    missing_information: list[str]
    alternative_interpretations: list[str]


def _extract_json(raw: str) -> dict:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in model response")
    return json.loads(match.group(0))


def _heuristic_fallback(query_text: str) -> QueryUnderstanding:
    words = [w.strip(".,?!") for w in query_text.split() if len(w.strip(".,?!")) > 4]
    return QueryUnderstanding(
        intent_summary=f"asking: {query_text.strip().rstrip('?')}",
        entities=words[:5],
        missing_information=[],
        alternative_interpretations=[],
    )


async def analyze_query(query_text: str) -> QueryUnderstanding:
    settings = get_settings()

    if settings.demo_mode:
        scenario = find_scenario_for_query(query_text)
        if scenario and scenario.understanding:
            return QueryUnderstanding(**scenario.understanding)
        return _heuristic_fallback(query_text)

    try:
        client = GeminiClient()
        raw = await client.generate(_PROMPT.format(query_text=query_text), large=False)
        data = _extract_json(raw)
        return QueryUnderstanding(
            intent_summary=str(data.get("intent_summary") or "").strip()
            or f"asking: {query_text.strip().rstrip('?')}",
            entities=[str(e) for e in (data.get("entities") or [])][:5],
            missing_information=[str(e) for e in (data.get("missing_information") or [])][:2],
            alternative_interpretations=[
                str(e) for e in (data.get("alternative_interpretations") or [])
            ][:2],
        )
    except Exception:
        # Best-effort enhancement, not core generation - any failure (bad key,
        # network, malformed JSON, quota) falls back rather than blocking the query.
        return _heuristic_fallback(query_text)
