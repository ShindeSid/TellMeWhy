from fastapi import APIRouter, HTTPException

from app.models.schemas import SourceListResponse, SourceUpdateRequest
from app.trust_graph import graph_store
from app.trust_graph.schema import SourceRecord

router = APIRouter(prefix="/api/sources", tags=["sources"])


@router.get("/{query_id}", response_model=SourceListResponse)
async def list_sources(query_id: str) -> SourceListResponse:
    query = await graph_store.get_query(query_id)
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    sources = await graph_store.list_sources(query_id)
    return SourceListResponse(query_id=query_id, sources=sources)


@router.patch("/{source_id}", response_model=SourceRecord)
async def update_source(source_id: str, payload: SourceUpdateRequest) -> SourceRecord:
    updated = await graph_store.set_source_enabled(source_id, payload.enabled)
    if not updated:
        raise HTTPException(status_code=404, detail="Source not found")
    return updated
