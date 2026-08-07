from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.routes.query import create_query, generate_answer
from app.demo.scenarios import SCENARIOS, find_scenario_by_id
from app.models.schemas import AnswerResponse, QueryCreateRequest

router = APIRouter(prefix="/api/demo", tags=["demo"])


class DemoScenarioSummary(BaseModel):
    id: str
    title: str
    query_text: str
    trust_slider_value: float
    uses_retrieval: bool


class DemoScenarioListResponse(BaseModel):
    scenarios: list[DemoScenarioSummary]


@router.get("/scenarios", response_model=DemoScenarioListResponse)
async def list_demo_scenarios() -> DemoScenarioListResponse:
    return DemoScenarioListResponse(
        scenarios=[
            DemoScenarioSummary(
                id=s.id,
                title=s.title,
                query_text=s.query_text,
                trust_slider_value=s.trust_slider_value,
                uses_retrieval=s.chunks is not None,
            )
            for s in SCENARIOS
        ]
    )


@router.post("/scenarios/{scenario_id}/run", response_model=AnswerResponse)
async def run_demo_scenario(scenario_id: str) -> AnswerResponse:
    """Runs a preset scenario through the real pipeline end to end (KAN
    routing, verification, trust scoring are all computed live from the
    scenario's query text - only the LLM call and retrieval are canned, via
    DEMO_MODE). Returns the same shape as POST /queries/{id}/answer so the
    frontend can load it into the normal workspace view."""
    scenario = find_scenario_by_id(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Unknown demo scenario")

    created = await create_query(
        QueryCreateRequest(
            text=scenario.query_text,
            trust_slider_value=scenario.trust_slider_value,
            has_uploaded_sources=False,
        )
    )
    return await generate_answer(created.query_id)
