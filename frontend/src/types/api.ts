// Mirrors backend/app/models/schemas.py and backend/app/trust_graph/schema.py.
// Keep in sync by hand for now - no shared codegen in a 24h hackathon.

export type Route = "small_llm" | "large_llm" | "rag";
export type RiskLevel = "low" | "medium" | "high";

export interface RoutingDecision {
  id: string;
  query_id: string;
  complexity_score: number;
  ambiguity_score: number;
  hallucination_risk: RiskLevel;
  needs_retrieval: boolean;
  needs_clarification: boolean;
  expected_confidence: number | null;
  token_budget: number | null;
  carbon_estimate_g: number | null;
  route: Route;
  rationale: string | null;
  created_at: string;
}

export interface QueryCreateResponse {
  query_id: string;
  raw_text: string;
  routing_decision: RoutingDecision;
}

export interface QueryDetailResponse {
  query_id: string;
  raw_text: string;
  intent_summary: string | null;
  domain: string | null;
  trust_slider_value: number;
  routing_decision: RoutingDecision | null;
}

export interface AnswerRecord {
  id: string;
  query_id: string;
  generation_number: number;
  text: string;
  route_used: Route;
  created_at: string;
}

export interface GenerationListResponse {
  query_id: string;
  generations: AnswerRecord[];
}

export interface AnswerResponse {
  query_id: string;
  answer: AnswerRecord;
}

export interface ReasoningStep {
  id: string;
  query_id: string;
  generation_number: number;
  stage: string;
  step_order: number;
  summary: string;
  confidence: number | null;
  created_at: string;
}

export interface ConfidenceEvent {
  id: string;
  query_id: string;
  generation_number: number;
  reasoning_step_id: string | null;
  confidence_before: number;
  confidence_after: number;
  reason: string;
  created_at: string;
}

export interface ReasoningTimelineResponse {
  query_id: string;
  steps: ReasoningStep[];
  confidence_events: ConfidenceEvent[];
}

export type ClaimStatus = "verified" | "weak" | "unsupported";

export interface Claim {
  id: string;
  query_id: string;
  generation_number: number;
  text: string;
  status: ClaimStatus;
  verification_notes: string | null;
  span_start: number | null;
  span_end: number | null;
  created_at: string;
}

export interface ClaimListResponse {
  query_id: string;
  claims: Claim[];
}

export interface TrustScoreRecord {
  id: string;
  query_id: string;
  generation_number: number;
  overall_trust: number;
  verification_score: number | null;
  freshness_score: number | null;
  reasoning_depth_score: number | null;
  plain_english_summary: string | null;
  created_at: string;
}

export interface TrustDashboardResponse {
  query_id: string;
  trust_score: TrustScoreRecord | null;
}

export interface SourceRecord {
  id: string;
  query_id: string;
  title: string | null;
  url_or_path: string | null;
  content: string | null;
  similarity: number | null;
  freshness_days: number | null;
  reliability_score: number | null;
  contribution_score: number | null;
  enabled: boolean;
  rejected: boolean;
  rejection_reason: string | null;
  created_at: string;
}

export interface SourceListResponse {
  query_id: string;
  sources: SourceRecord[];
}

export interface ApiError {
  detail: string;
}

export interface DemoScenarioSummary {
  id: string;
  title: string;
  query_text: string;
  trust_slider_value: number;
  uses_retrieval: boolean;
}

export interface DemoScenarioListResponse {
  scenarios: DemoScenarioSummary[];
}
