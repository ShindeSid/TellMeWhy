"""Highlight -> Simplify (F25): rewrites one sentence in plain language.
Ephemeral by design (not persisted) - it's a reading aid, not a new claim to
verify, so it doesn't need its own row in the Trust Graph."""

from app.core.config import get_settings
from app.routing.llm_clients import GeminiClient

_PROMPT = (
    "Rewrite the following sentence in simple, plain language a beginner with no background "
    "knowledge could understand. Keep it factually the same - do not add or remove information, "
    "just simplify the wording. Respond with ONLY the rewritten sentence, nothing else.\n\n"
    "Sentence: {text}"
)


async def simplify_text(text: str) -> str:
    settings = get_settings()
    if settings.demo_mode:
        return f"In simple terms: {text}"

    try:
        client = GeminiClient()
        result = await client.generate(_PROMPT.format(text=text), large=False)
        return result.strip() or text
    except Exception:
        return text
