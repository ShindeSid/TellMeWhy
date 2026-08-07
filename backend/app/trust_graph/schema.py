"""Pydantic models mirroring Trust Graph DB rows (backend/app/db/schema.sql)."""

from pydantic import BaseModel


class QueryRecord(BaseModel):
    id: str
    raw_text: str
    intent_summary: str | None = None
    domain: str | None = None
    entities: str | None = None                    # JSON-encoded list[str]
    missing_information: str | None = None          # JSON-encoded list[str]
    alternative_interpretations: str | None = None   # JSON-encoded list[str]
    trust_slider_value: float
    created_at: str


class RoutingDecisionRecord(BaseModel):
    id: str
    query_id: str
    complexity_score: float
    ambiguity_score: float
    hallucination_risk: str
    needs_retrieval: bool
    needs_clarification: bool
    expected_confidence: float | None
    token_budget: int | None
    carbon_estimate_g: float | None
    route: str
    rationale: str | None
    created_at: str


class SourceRecord(BaseModel):
    id: str
    query_id: str
    title: str | None
    url_or_path: str | None
    content: str | None
    similarity: float | None
    freshness_days: int | None
    reliability_score: float | None
    contribution_score: float | None
    enabled: bool
    rejected: bool
    rejection_reason: str | None
    created_at: str


class AnswerRecord(BaseModel):
    id: str
    query_id: str
    generation_number: int
    text: str
    route_used: str
    created_at: str


class ReasoningStepRecord(BaseModel):
    id: str
    query_id: str
    generation_number: int
    stage: str
    step_order: int
    summary: str
    confidence: float | None
    created_at: str


class ConfidenceEventRecord(BaseModel):
    id: str
    query_id: str
    generation_number: int
    reasoning_step_id: str | None
    confidence_before: float
    confidence_after: float
    reason: str
    created_at: str


class ClaimRecord(BaseModel):
    id: str
    query_id: str
    generation_number: int
    text: str
    status: str
    verification_notes: str | None
    span_start: int | None
    span_end: int | None
    created_at: str


class TrustScoreRecord(BaseModel):
    id: str
    query_id: str
    generation_number: int
    overall_trust: float
    verification_score: float | None
    freshness_score: float | None
    reasoning_depth_score: float | None
    plain_english_summary: str | None
    created_at: str


class KnowledgeItemRecord(BaseModel):
    id: str
    title: str
    source_type: str
    origin: str | None
    chunk_count: int
    created_at: str
