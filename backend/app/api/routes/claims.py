from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import ClaimListResponse
from app.trust_graph import graph_store

router = APIRouter(prefix="/api/claims", tags=["claims"])


@router.get("/{query_id}", response_model=ClaimListResponse)
async def list_claims(
    query_id: str, generation: int | None = Query(default=None, ge=1)
) -> ClaimListResponse:
    query = await graph_store.get_query(query_id)
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    claims = await graph_store.list_claims(query_id, generation)
    return ClaimListResponse(query_id=query_id, claims=claims)
