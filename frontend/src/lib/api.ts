import type {
  AnswerResponse,
  AuthResponse,
  AuthUser,
  ClaimListResponse,
  DemoScenarioListResponse,
  GenerationListResponse,
  KnowledgeListResponse,
  KnowledgeUploadResponse,
  QueryCreateResponse,
  QueryDetailResponse,
  ReasoningTimelineResponse,
  SimplifyResponse,
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

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = init?.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiRequestError(response.status, body.detail ?? response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
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

export type RunMode = "answer" | "regenerate" | "improve";

export function startRun(
  queryId: string,
  mode: RunMode = "answer",
  claimId?: string
): Promise<{ run_id: string }> {
  return request(`/api/queries/${queryId}/runs`, {
    method: "POST",
    body: JSON.stringify({ mode, claim_id: claimId ?? null }),
  });
}

export function runEventsUrl(runId: string): string {
  return `${BASE_URL}/api/runs/${runId}/events`;
}

export function resumeRun(runId: string, sourceAdded: boolean): Promise<{ status: string }> {
  return request(`/api/runs/${runId}/resume`, {
    method: "POST",
    body: JSON.stringify({ source_added: sourceAdded }),
  });
}

export function regenerateAnswer(queryId: string): Promise<AnswerResponse> {
  return request(`/api/queries/${queryId}/regenerate`, { method: "POST" });
}

export function improveClaim(queryId: string, claimId: string): Promise<AnswerResponse> {
  return request(`/api/queries/${queryId}/claims/${claimId}/improve`, { method: "POST" });
}

export function simplifyClaim(claimId: string): Promise<SimplifyResponse> {
  return request(`/api/claims/${claimId}/simplify`, { method: "POST" });
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

export function listKnowledge(): Promise<KnowledgeListResponse> {
  return request("/api/knowledge");
}

export function uploadKnowledgeFile(file: File): Promise<KnowledgeUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  return request("/api/knowledge/upload-file", { method: "POST", body: form });
}

export function uploadKnowledgeUrl(url: string): Promise<KnowledgeUploadResponse> {
  const form = new FormData();
  form.append("url", url);
  return request("/api/knowledge/upload-url", { method: "POST", body: form });
}

export function uploadKnowledgeText(text: string, title?: string): Promise<KnowledgeUploadResponse> {
  return request("/api/knowledge/upload-text", {
    method: "POST",
    body: JSON.stringify({ text, title }),
  });
}

export function deleteKnowledgeItem(itemId: string): Promise<void> {
  return request(`/api/knowledge/${itemId}`, { method: "DELETE" });
}

export function signup(email: string, password: string): Promise<AuthResponse> {
  return request("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function logout(): Promise<void> {
  return request("/api/auth/logout", { method: "POST" });
}

export function me(): Promise<AuthUser | null> {
  return request("/api/auth/me");
}
