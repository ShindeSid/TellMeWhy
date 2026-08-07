"""
Stable I/O contract for the KAN Cognitive Router.

Any routing implementation (heuristic, small classifier, a real
Kolmogorov-Arnold Network) must accept QueryInput and return
RoutingDecision. Nothing outside this package should depend on how a
RoutingDecision is produced - only on this shape. That is what lets the
router be replaced later without touching the API, adaptive routing
engine, or frontend.
"""

from typing import Literal, Protocol

from pydantic import BaseModel, Field

Route = Literal["small_llm", "large_llm", "rag"]
RiskLevel = Literal["low", "medium", "high"]


class QueryInput(BaseModel):
    text: str
    trust_slider_value: float = Field(default=0.5, ge=0.0, le=1.0)
    has_uploaded_sources: bool = False


class RoutingDecision(BaseModel):
    complexity_score: float = Field(ge=0.0, le=1.0)
    ambiguity_score: float = Field(ge=0.0, le=1.0)
    domain: str
    needs_retrieval: bool
    needs_clarification: bool
    expected_confidence: float = Field(ge=0.0, le=1.0)
    token_budget: int
    carbon_estimate_g: float
    hallucination_risk: RiskLevel
    route: Route
    rationale: str


class CognitiveRouter(Protocol):
    def analyze(self, query: QueryInput) -> RoutingDecision: ...
