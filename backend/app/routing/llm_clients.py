import asyncio
import threading
from typing import AsyncIterator

import google.generativeai as genai

from app.core.config import get_settings


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


