import asyncio
import re

import google.generativeai as genai

from app.core.config import get_settings
from app.demo.scenarios import find_scenario_for_query


class GeminiUnavailableError(RuntimeError):
    """Raised when GEMINI_API_KEY is not configured."""


class GeminiClient:
    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.gemini_api_key
        self._small_model_name = settings.gemini_small_model
        self._large_model_name = settings.gemini_large_model
        self._configured = False

    def _ensure_configured(self) -> None:
        if not self._api_key:
            raise GeminiUnavailableError(
                "GEMINI_API_KEY is not set. Add it to backend/.env to enable generation."
            )
        if not self._configured:
            genai.configure(api_key=self._api_key)
            self._configured = True

    async def generate(self, prompt: str, *, large: bool) -> str:
        self._ensure_configured()
        model_name = self._large_model_name if large else self._small_model_name
        model = genai.GenerativeModel(model_name)
        response = await asyncio.to_thread(model.generate_content, prompt)
        return response.text


_QUESTION_LINE = re.compile(r"Question:\s*(.+)")


class DemoLLMClient:
    """Demo Mode (F39): returns a preset answer instead of calling Gemini.
    Matches the scenario by looking for its query text inside the prompt -
    works for both the direct prompt (small/large LLM) and the
    "Context:...\\nQuestion: ...\\n" RAG prompt shape."""

    async def generate(self, prompt: str, *, large: bool) -> str:
        match = _QUESTION_LINE.search(prompt)
        query_text = match.group(1).strip() if match else prompt.strip()

        scenario = find_scenario_for_query(query_text)
        if scenario:
            return scenario.canned_answer

        return (
            "[Demo Mode] No preset answer matches this query - Demo Mode only has canned "
            "responses for the three preset scenarios (Medical, Programming, Current Affairs). "
            "Try one of those, or configure a real GEMINI_API_KEY to answer arbitrary questions."
        )
