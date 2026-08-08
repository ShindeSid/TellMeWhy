"""Counterfactual explanation (V2 pivot): "what would change this" - instead
of leaving a weak/unsupported claim as a dead end, name the specific
condition that would move it to verified. Ephemeral by design, same as
simplify.py - a reading aid, not a new claim requiring its own verification."""

from app.routing.llm_clients import GeminiClient

_PROMPT = (
    "A claim in an AI-generated answer could not be well verified against the available sources. "
    "In ONE short sentence, state the single most specific, concrete thing that would need to be "
    "true or found for this claim to become well-supported (e.g. a specific type of source, a "
    "specific missing detail). Do not restate the claim or add hedging language - just the "
    "condition. Respond with ONLY that one sentence.\n\n"
    "Claim: {text}\n"
    "Why it wasn't well supported: {notes}"
)


def _heuristic_fallback(notes: str | None) -> str:
    if notes and "overlap" in notes.lower():
        return "A source that directly discusses this specific detail, not just related topics, would confirm it."
    return "An independent source that directly states this would confirm it."


async def counterfactual_text(claim_text: str, verification_notes: str | None) -> str:
    try:
        client = GeminiClient()
        result = await client.generate(
            _PROMPT.format(text=claim_text, notes=verification_notes or "no matching context found"),
            large=False,
        )
        return result.strip() or _heuristic_fallback(verification_notes)
    except Exception:
        return _heuristic_fallback(verification_notes)
