from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import TrustDashboardResponse
from app.trust_graph import graph_store

router = APIRouter(prefix="/api/trust", tags=["trust"])


@router.get("/{query_id}", response_model=TrustDashboardResponse)
async def get_trust_dashboard(
    query_id: str, generation: int | None = Query(default=None, ge=1)
) -> TrustDashboardResponse:
    query = await graph_store.get_query(query_id)
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    trust_score = await graph_store.get_trust_score(query_id, generation)
    return TrustDashboardResponse(query_id=query_id, trust_score=trust_score)
