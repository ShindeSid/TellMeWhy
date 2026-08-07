"""In-memory registry mapping run_id -> its event bus (+ HITL resume signal).
Single-process only - see docs/architecture.md trade-offs section."""

import asyncio
import time
import uuid

from app.streaming.bus import RunEventBus

_RUN_TTL_SECONDS = 600


class RunHandle:
    def __init__(self, run_id: str) -> None:
        self.run_id = run_id
        self.bus = RunEventBus()
        self.created_at = time.time()
        # HITL resume (Feature 2): pipeline awaits this; /resume sets it.
        self.resume_event = asyncio.Event()
        self.resume_payload: dict | None = None

    def resume(self, payload: dict | None = None) -> None:
        self.resume_payload = payload
        self.resume_event.set()


_runs: dict[str, RunHandle] = {}


def create_run() -> RunHandle:
    _evict_stale()
    handle = RunHandle(run_id=str(uuid.uuid4()))
    _runs[handle.run_id] = handle
    return handle


def get_run(run_id: str) -> RunHandle | None:
    return _runs.get(run_id)


def _evict_stale() -> None:
    cutoff = time.time() - _RUN_TTL_SECONDS
    for rid in [rid for rid, h in _runs.items() if h.created_at < cutoff]:
        _runs.pop(rid, None)
