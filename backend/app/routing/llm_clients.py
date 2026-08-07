import asyncio
import re
import threading
from typing import AsyncIterator

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

    async def generate_stream(self, prompt: str, *, large: bool) -> AsyncIterator[str]:
        """Real token/chunk-level streaming via the Gemini SDK's stream=True.
        The SDK's stream is a blocking sync iterator, so it's driven from a
        background thread and bridged into an asyncio queue rather than
        blocking the event loop chunk-by-chunk."""
        self._ensure_configured()
        model_name = self._large_model_name if large else self._small_model_name
        model = genai.GenerativeModel(model_name)

        loop = asyncio.get_event_loop()
        queue: asyncio.Queue[str | None | Exception] = asyncio.Queue()

        def _run() -> None:
            try:
                for chunk in model.generate_content(prompt, stream=True):
                    if chunk.text:
                        loop.call_soon_threadsafe(queue.put_nowait, chunk.text)
            except Exception as exc:  # noqa: BLE001 - surfaced to the async side below
                loop.call_soon_threadsafe(queue.put_nowait, exc)
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)

        threading.Thread(target=_run, daemon=True).start()

        while True:
            item = await queue.get()
            if item is None:
                return
            if isinstance(item, Exception):
                raise item
            yield item


_QUESTION_LINE = re.compile(r"Question:\s*(.+)")
_SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])\s+")


class DemoLLMClient:
    """Demo Mode (F39): returns a preset answer instead of calling Gemini.
    Matches the scenario by looking for its query text inside the prompt -
    works for both the direct prompt (small/large LLM) and the
    "Context:...\\nQuestion: ...\\n" RAG prompt shape."""

    async def generate(self, prompt: str, *, large: bool) -> str:
        return self._resolve(prompt)

    async def generate_stream(self, prompt: str, *, large: bool) -> AsyncIterator[str]:
        """NOT live generation - the full canned answer is already known
        before this is called. This replays it sentence-by-sentence on a
        fixed cadence purely so the streaming UI has something to animate
        in Demo Mode, since DemoLLMClient has nothing real to stream from.
        This is the one deliberate, disclosed exception to "no fake
        progress" in the whole streaming pipeline - every other event in
        app/streaming/pipeline.py corresponds to genuine backend work."""
        full = self._resolve(prompt)
        for sentence in _SENTENCE_BOUNDARY.split(full):
            if sentence:
                yield sentence + " "
                await asyncio.sleep(0.15)

    def _resolve(self, prompt: str) -> str:
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
