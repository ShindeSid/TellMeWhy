import asyncio

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.streaming import registry
from app.streaming.pipeline import run_answer, run_regenerate
from app.trust_graph import graph_store

router = APIRouter(prefix="/api", tags=["runs"])


class StartRunRequest(BaseModel):
    mode: str = "answer"  # "answer" | "regenerate" | "improve"
    claim_id: str | None = None  # required for mode="improve"


class StartRunResponse(BaseModel):
    run_id: str


class ResumeRequest(BaseModel):
    source_added: bool = False


@router.post("/queries/{query_id}/runs", response_model=StartRunResponse, status_code=201)
async def start_run(query_id: str, payload: StartRunRequest) -> StartRunResponse:
    query = await graph_store.get_query(query_id)
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    latest_generation = await graph_store.get_latest_generation_number(query_id)
    handle = registry.create_run()

    if payload.mode == "answer":
        if latest_generation > 0:
            raise HTTPException(
                status_code=409,
                detail="An answer already exists for this query. Use mode=regenerate instead.",
            )
        asyncio.create_task(run_answer(query_id, 1, handle.bus, handle))

    elif payload.mode == "regenerate":
        if latest_generation == 0:
            raise HTTPException(status_code=409, detail="No prior answer to regenerate from.")
        asyncio.create_task(run_regenerate(query_id, latest_generation + 1, handle.bus))

    elif payload.mode == "improve":
        if latest_generation == 0:
            raise HTTPException(status_code=409, detail="No prior answer to improve from.")
        if not payload.claim_id:
            raise HTTPException(status_code=400, detail="claim_id is required for mode=improve")
        claim = await graph_store.get_claim(payload.claim_id)
        if not claim or claim.query_id != query_id:
            raise HTTPException(status_code=404, detail="Claim not found for this query")
        instruction = (
            f'The previous answer included this statement, which could not be well supported: '
            f'"{claim.text}"'
            + (f" ({claim.verification_notes})" if claim.verification_notes else "")
            + " Revise the answer to fix, better support, or remove that statement, while keeping "
            "the rest as accurate as before."
        )
        asyncio.create_task(run_regenerate(query_id, latest_generation + 1, handle.bus, extra_instruction=instruction))

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported run mode: {payload.mode}")

    return StartRunResponse(run_id=handle.run_id)


@router.get("/runs/{run_id}/events")
async def stream_run_events(run_id: str) -> StreamingResponse:
    handle = registry.get_run(run_id)
    if not handle:
        raise HTTPException(status_code=404, detail="Run not found (it may have already finished and expired)")

    return StreamingResponse(
        handle.bus.stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/runs/{run_id}/resume")
async def resume_run(run_id: str, payload: ResumeRequest) -> dict:
    """Human-in-the-loop resume (Feature 2): unblocks a run currently paused
    at WAITING_FOR_USER_INPUT. Safe to call even if the run already timed
    out and moved on - resume_event.set() on an already-consumed run is a
    no-op there's just nothing left waiting on it."""
    handle = registry.get_run(run_id)
    if not handle:
        raise HTTPException(status_code=404, detail="Run not found")

    handle.resume({"source_added": payload.source_added})
    return {"status": "resumed"}
