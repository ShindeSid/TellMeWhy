"""API-facing request/response models. Distinct from KAN's internal
QueryInput/RoutingDecision (app/kan/interface.py) and from the Trust Graph's
DB-mirroring records (app/trust_graph/schema.py) - this is what the
frontend actually sees over HTTP."""

import json

from pydantic import BaseModel, Field

from app.trust_graph.schema import (
    AnswerRecord,
    ClaimRecord,
    ConfidenceEventRecord,
    KnowledgeItemRecord,
    QueryRecord,
    ReasoningStepRecord,
    RoutingDecisionRecord,
    SourceRecord,
    TrustScoreRecord,
)
from app.understanding.decision import DecisionRecord
from app.understanding.service import QueryUnderstanding


class QueryCreateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=8000)
    trust_slider_value: float = Field(default=0.5, ge=0.0, le=1.0)
    has_uploaded_sources: bool = False


class QueryCreateResponse(BaseModel):
    query_id: str
    raw_text: str
    routing_decision: RoutingDecisionRecord
    understanding: QueryUnderstanding


class QueryDetailResponse(BaseModel):
    query_id: str
    raw_text: str
    intent_summary: str | None
    domain: str | None
    entities: list[str]
    missing_information: list[str]
    alternative_interpretations: list[str]
    trust_slider_value: float
    routing_decision: RoutingDecisionRecord | None

    @classmethod
    def from_query_record(
        cls, query: QueryRecord, routing_decision: RoutingDecisionRecord | None
    ) -> "QueryDetailResponse":
        return cls(
            query_id=query.id,
            raw_text=query.raw_text,
            intent_summary=query.intent_summary,
            domain=query.domain,
            entities=json.loads(query.entities) if query.entities else [],
            missing_information=json.loads(query.missing_information) if query.missing_information else [],
            alternative_interpretations=(
                json.loads(query.alternative_interpretations) if query.alternative_interpretations else []
            ),
            trust_slider_value=query.trust_slider_value,
            routing_decision=routing_decision,
        )


class AnswerResponse(BaseModel):
    query_id: str
    answer: AnswerRecord
    decision: DecisionRecord | None = None


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


class SimplifyResponse(BaseModel):
    claim_id: str
    original_text: str
    simplified_text: str


class CounterfactualResponse(BaseModel):
    claim_id: str
    original_text: str
    would_change_if: str


class KnowledgeUploadRequest(BaseModel):
    url: str | None = None
    text: str | None = None
    title: str | None = None


class KnowledgeUploadResponse(BaseModel):
    item: KnowledgeItemRecord
    chunk_count: int


class KnowledgeListResponse(BaseModel):
    items: list[KnowledgeItemRecord]


class ErrorResponse(BaseModel):
    detail: str
