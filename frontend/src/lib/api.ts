import type {
  AnswerResponse,
  ClaimListResponse,
  DemoScenarioListResponse,
  GenerationListResponse,
  QueryCreateResponse,
  QueryDetailResponse,
  ReasoningTimelineResponse,
  SourceListResponse,
  SourceRecord,
  TrustDashboardResponse,
} from "@/types/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiRequestError(response.status, body.detail ?? response.statusText);
  }

  return response.json() as Promise<T>;
}

export function createQuery(
  text: string,
  trustSliderValue: number,
  hasUploadedSources = false
): Promise<QueryCreateResponse> {
  return request("/api/queries", {
    method: "POST",
    body: JSON.stringify({
      text,
      trust_slider_value: trustSliderValue,
      has_uploaded_sources: hasUploadedSources,
    }),
  });
}

export function getQuery(queryId: string): Promise<QueryDetailResponse> {
  return request(`/api/queries/${queryId}`);
}

export function generateAnswer(queryId: string): Promise<AnswerResponse> {
  return request(`/api/queries/${queryId}/answer`, { method: "POST" });
}

export function regenerateAnswer(queryId: string): Promise<AnswerResponse> {
  return request(`/api/queries/${queryId}/regenerate`, { method: "POST" });
}

export function listGenerations(queryId: string): Promise<GenerationListResponse> {
  return request(`/api/queries/${queryId}/generations`);
}

export function getTrustDashboard(queryId: string): Promise<TrustDashboardResponse> {
  return request(`/api/trust/${queryId}`);
}

export function getReasoningTimeline(queryId: string): Promise<ReasoningTimelineResponse> {
  return request(`/api/reasoning/${queryId}`);
}

export function getClaims(queryId: string): Promise<ClaimListResponse> {
  return request(`/api/claims/${queryId}`);
}

export function listSources(queryId: string): Promise<SourceListResponse> {
  return request(`/api/sources/${queryId}`);
}

export function setSourceEnabled(sourceId: string, enabled: boolean): Promise<SourceRecord> {
  return request(`/api/sources/${sourceId}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export function listDemoScenarios(): Promise<DemoScenarioListResponse> {
  return request("/api/demo/scenarios");
}

export function runDemoScenario(scenarioId: string): Promise<AnswerResponse> {
  return request(`/api/demo/scenarios/${scenarioId}/run`, { method: "POST" });
}
