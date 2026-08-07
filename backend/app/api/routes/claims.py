from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import ClaimListResponse, SimplifyResponse
from app.trust_graph import graph_store
from app.understanding.simplify import simplify_text

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


@router.post("/{claim_id}/simplify", response_model=SimplifyResponse)
async def simplify_claim(claim_id: str) -> SimplifyResponse:
    claim = await graph_store.get_claim(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    simplified = await simplify_text(claim.text)
    return SimplifyResponse(claim_id=claim.id, original_text=claim.text, simplified_text=simplified)
