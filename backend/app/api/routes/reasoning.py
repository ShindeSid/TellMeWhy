from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import ReasoningTimelineResponse
from app.trust_graph import graph_store

router = APIRouter(prefix="/api/reasoning", tags=["reasoning"])


@router.get("/{query_id}", response_model=ReasoningTimelineResponse)
async def get_reasoning_timeline(
    query_id: str, generation: int | None = Query(default=None, ge=1)
) -> ReasoningTimelineResponse:
    query = await graph_store.get_query(query_id)
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    steps = await graph_store.list_reasoning_steps(query_id, generation)
    events = await graph_store.list_confidence_events(query_id, generation)
    return ReasoningTimelineResponse(query_id=query_id, steps=steps, confidence_events=events)
