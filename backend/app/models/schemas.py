"""API-facing request/response models. Distinct from KAN's internal
QueryInput/RoutingDecision (app/kan/interface.py) and from the Trust Graph's
DB-mirroring records (app/trust_graph/schema.py) - this is what the
frontend actually sees over HTTP."""

from pydantic import BaseModel, Field

from app.trust_graph.schema import (
    AnswerRecord,
    ClaimRecord,
    ConfidenceEventRecord,
    ReasoningStepRecord,
    RoutingDecisionRecord,
    SourceRecord,
    TrustScoreRecord,
)


class QueryCreateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=8000)
    trust_slider_value: float = Field(default=0.5, ge=0.0, le=1.0)
    has_uploaded_sources: bool = False


class QueryCreateResponse(BaseModel):
    query_id: str
    raw_text: str
    routing_decision: RoutingDecisionRecord


class QueryDetailResponse(BaseModel):
    query_id: str
    raw_text: str
    intent_summary: str | None
    domain: str | None
    trust_slider_value: float
    routing_decision: RoutingDecisionRecord | None


class AnswerResponse(BaseModel):
    query_id: str
    answer: AnswerRecord


class ReasoningTimelineResponse(BaseModel):
    query_id: str
    steps: list[ReasoningStepRecord]
    confidence_events: list[ConfidenceEventRecord]


class ClaimListResponse(BaseModel):
    query_id: str
    claims: list[ClaimRecord]


class TrustDashboardResponse(BaseModel):
    query_id: str
    trust_score: TrustScoreRecord | None


class SourceListResponse(BaseModel):
    query_id: str
    sources: list[SourceRecord]


class SourceUpdateRequest(BaseModel):
    enabled: bool


class GenerationListResponse(BaseModel):
    query_id: str
    generations: list[AnswerRecord]


class ErrorResponse(BaseModel):
    detail: str
