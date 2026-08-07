"""Per-run pub/sub. One RunEventBus per in-flight pipeline run - an asyncio
Queue is enough here because this is a single-process server (see
docs/architecture.md for the multi-process trade-off if that ever changes)."""

import asyncio

from app.streaming.events import EventType, ReasoningEvent

_TERMINAL_EVENTS = {EventType.ANSWER_COMPLETED, EventType.ERROR}


class RunEventBus:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[ReasoningEvent] = asyncio.Queue()
        self._closed = False

    async def emit(self, event: str, **data) -> None:
        if self._closed:
            return
        await self._queue.put(ReasoningEvent(event=event, data=data))
        if event in _TERMINAL_EVENTS:
            self._closed = True

    async def stream(self):
        """Async generator yielding SSE-formatted strings until a terminal event."""
        while True:
            item = await self._queue.get()
            yield item.to_sse()
            if item.event in _TERMINAL_EVENTS:
                return
