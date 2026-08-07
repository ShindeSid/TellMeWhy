import { create } from "zustand";

import {
  ApiRequestError,
  createQuery,
  generateAnswer,
  getClaims,
  getQuery,
  getReasoningTimeline,
  getTrustDashboard,
  listGenerations,
  listSources,
  regenerateAnswer,
  runDemoScenario,
  setSourceEnabled,
} from "@/lib/api";
import type {
  AnswerRecord,
  Claim,
  ConfidenceEvent,
  ReasoningStep,
  RoutingDecision,
  SourceRecord,
  TrustScoreRecord,
} from "@/types/api";

export type WorkspaceStatus = "idle" | "routing" | "generating" | "ready" | "error";

interface WorkspaceState {
  queryText: string;
  trustSliderValue: number;

  queryId: string | null;
  routingDecision: RoutingDecision | null;
  answer: AnswerRecord | null;
  reasoningSteps: ReasoningStep[];
  confidenceEvents: ConfidenceEvent[];
  trustScore: TrustScoreRecord | null;
  claims: Claim[];
  sources: SourceRecord[];
  generationCount: number;
  isRegenerating: boolean;

  status: WorkspaceStatus;
  errorMessage: string | null;

  setQueryText: (text: string) => void;
  setTrustSliderValue: (value: number) => void;
  submitQuery: () => Promise<void>;
  runDemoScenario: (scenarioId: string) => Promise<void>;
  toggleSource: (sourceId: string, enabled: boolean) => Promise<void>;
  regenerate: () => Promise<void>;
  reset: () => void;
}

async function fetchGenerationArtifacts(queryId: string) {
  const [timeline, trust, claimsResponse, sourcesResponse, generations] = await Promise.all([
    getReasoningTimeline(queryId),
    getTrustDashboard(queryId),
    getClaims(queryId),
    listSources(queryId),
    listGenerations(queryId),
  ]);
  return { timeline, trust, claimsResponse, sourcesResponse, generations };
}

function clearResults(): Pick<
  WorkspaceState,
  | "answer"
  | "routingDecision"
  | "queryId"
  | "reasoningSteps"
  | "confidenceEvents"
  | "trustScore"
  | "claims"
  | "sources"
  | "generationCount"
> {
  return {
    answer: null,
    routingDecision: null,
    queryId: null,
    reasoningSteps: [],
    confidenceEvents: [],
    trustScore: null,
    claims: [],
    sources: [],
    generationCount: 0,
  };
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  queryText: "",
  trustSliderValue: 0.5,

  ...clearResults(),
  isRegenerating: false,

  status: "idle",
  errorMessage: null,

  setQueryText: (text) => set({ queryText: text }),
  setTrustSliderValue: (value) => set({ trustSliderValue: value }),

  submitQuery: async () => {
    const { queryText, trustSliderValue } = get();
    if (!queryText.trim()) return;

    set({ status: "routing", errorMessage: null, ...clearResults() });

    try {
      const created = await createQuery(queryText, trustSliderValue);
      set({ queryId: created.query_id, routingDecision: created.routing_decision, status: "generating" });

      const answered = await generateAnswer(created.query_id);
      const { timeline, trust, claimsResponse, sourcesResponse, generations } =
        await fetchGenerationArtifacts(created.query_id);

      set({
        answer: answered.answer,
        reasoningSteps: timeline.steps,
        confidenceEvents: timeline.confidence_events,
        trustScore: trust.trust_score,
        claims: claimsResponse.claims,
        sources: sourcesResponse.sources,
        generationCount: generations.generations.length,
        status: "ready",
      });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Unexpected error";
      set({ status: "error", errorMessage: message });
    }
  },

  runDemoScenario: async (scenarioId) => {
    set({ status: "routing", errorMessage: null, ...clearResults() });

    try {
      const answered = await runDemoScenario(scenarioId);
      const queryId = answered.query_id;
      set({ queryId, status: "generating", queryText: "" });

      const [detail, { timeline, trust, claimsResponse, sourcesResponse, generations }] = await Promise.all([
        getQuery(queryId),
        fetchGenerationArtifacts(queryId),
      ]);

      set({
        queryText: detail.raw_text,
        routingDecision: detail.routing_decision,
        answer: answered.answer,
        reasoningSteps: timeline.steps,
        confidenceEvents: timeline.confidence_events,
        trustScore: trust.trust_score,
        claims: claimsResponse.claims,
        sources: sourcesResponse.sources,
        generationCount: generations.generations.length,
        status: "ready",
      });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Unexpected error";
      set({ status: "error", errorMessage: message });
    }
  },

  toggleSource: async (sourceId, enabled) => {
    const updated = await setSourceEnabled(sourceId, enabled);
    set((state) => ({
      sources: state.sources.map((s) => (s.id === updated.id ? updated : s)),
    }));
  },

  regenerate: async () => {
    const { queryId } = get();
    if (!queryId) return;

    set({ isRegenerating: true, errorMessage: null });
    try {
      const answered = await regenerateAnswer(queryId);
      const { timeline, trust, claimsResponse, sourcesResponse, generations } =
        await fetchGenerationArtifacts(queryId);

      set({
        answer: answered.answer,
        reasoningSteps: timeline.steps,
        confidenceEvents: timeline.confidence_events,
        trustScore: trust.trust_score,
        claims: claimsResponse.claims,
        sources: sourcesResponse.sources,
        generationCount: generations.generations.length,
        isRegenerating: false,
      });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Unexpected error";
      set({ isRegenerating: false, errorMessage: message });
    }
  },

  reset: () =>
    set({
      queryText: "",
      ...clearResults(),
      isRegenerating: false,
      status: "idle",
      errorMessage: null,
    }),
}));
