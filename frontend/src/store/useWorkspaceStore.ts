import { create } from "zustand";

import {
  ApiRequestError,
  createQuery,
  generateAnswer,
  getClaims,
  getQuery,
  getReasoningTimeline,
  getTrustDashboard,
  improveClaim,
  listGenerations,
  listKnowledge,
  listSources,
  regenerateAnswer,
  runDemoScenario,
  setSourceEnabled,
  simplifyClaim,
  uploadKnowledgeFile,
  uploadKnowledgeText,
  uploadKnowledgeUrl,
} from "@/lib/api";
import type {
  AnswerRecord,
  Claim,
  ConfidenceEvent,
  KnowledgeItem,
  QueryUnderstanding,
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
  understanding: QueryUnderstanding | null;
  understandingDismissed: boolean;
  routingDecision: RoutingDecision | null;
  answer: AnswerRecord | null;
  reasoningSteps: ReasoningStep[];
  confidenceEvents: ConfidenceEvent[];
  trustScore: TrustScoreRecord | null;
  claims: Claim[];
  sources: SourceRecord[];
  generationCount: number;
  isRegenerating: boolean;
  improvingClaimId: string | null;
  simplifiedClaims: Record<string, string>;
  simplifyingClaimId: string | null;
  hitlAcknowledged: boolean;

  knowledgeItems: KnowledgeItem[];
  isUploading: boolean;
  uploadError: string | null;

  status: WorkspaceStatus;
  errorMessage: string | null;

  setQueryText: (text: string) => void;
  setTrustSliderValue: (value: number) => void;
  submitQuery: () => Promise<void>;
  runDemoScenario: (scenarioId: string) => Promise<void>;
  toggleSource: (sourceId: string, enabled: boolean) => Promise<void>;
  regenerate: () => Promise<void>;
  improveClaim: (claimId: string) => Promise<void>;
  simplifyClaim: (claimId: string) => Promise<void>;
  dismissUnderstanding: () => void;
  acknowledgeHitl: () => void;
  fetchKnowledge: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  uploadUrl: (url: string) => Promise<void>;
  uploadText: (text: string, title?: string) => Promise<void>;
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
  | "understanding"
  | "understandingDismissed"
  | "reasoningSteps"
  | "confidenceEvents"
  | "trustScore"
  | "claims"
  | "sources"
  | "generationCount"
  | "simplifiedClaims"
  | "hitlAcknowledged"
> {
  return {
    answer: null,
    routingDecision: null,
    queryId: null,
    understanding: null,
    understandingDismissed: false,
    reasoningSteps: [],
    confidenceEvents: [],
    trustScore: null,
    claims: [],
    sources: [],
    generationCount: 0,
    simplifiedClaims: {},
    hitlAcknowledged: false,
  };
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  queryText: "",
  trustSliderValue: 0.5,

  ...clearResults(),
  isRegenerating: false,
  improvingClaimId: null,
  simplifyingClaimId: null,

  knowledgeItems: [],
  isUploading: false,
  uploadError: null,

  status: "idle",
  errorMessage: null,

  setQueryText: (text) => set({ queryText: text }),
  setTrustSliderValue: (value) => set({ trustSliderValue: value }),

  submitQuery: async () => {
    const { queryText, trustSliderValue, knowledgeItems } = get();
    if (!queryText.trim()) return;

    set({ status: "routing", errorMessage: null, ...clearResults() });

    try {
      const created = await createQuery(queryText, trustSliderValue, knowledgeItems.length > 0);
      set({
        queryId: created.query_id,
        routingDecision: created.routing_decision,
        understanding: created.understanding,
        status: "generating",
      });

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
        understanding: {
          intent_summary: detail.intent_summary ?? "",
          entities: detail.entities,
          missing_information: detail.missing_information,
          alternative_interpretations: detail.alternative_interpretations,
        },
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
        simplifiedClaims: {},
        hitlAcknowledged: false,
      });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Unexpected error";
      set({ isRegenerating: false, errorMessage: message });
    }
  },

  improveClaim: async (claimId) => {
    const { queryId } = get();
    if (!queryId) return;

    set({ improvingClaimId: claimId, errorMessage: null });
    try {
      const answered = await improveClaim(queryId, claimId);
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
        improvingClaimId: null,
        simplifiedClaims: {},
        hitlAcknowledged: false,
      });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Unexpected error";
      set({ improvingClaimId: null, errorMessage: message });
    }
  },

  simplifyClaim: async (claimId) => {
    set({ simplifyingClaimId: claimId });
    try {
      const result = await simplifyClaim(claimId);
      set((state) => ({
        simplifiedClaims: { ...state.simplifiedClaims, [claimId]: result.simplified_text },
        simplifyingClaimId: null,
      }));
    } catch {
      set({ simplifyingClaimId: null });
    }
  },

  dismissUnderstanding: () => set({ understandingDismissed: true }),
  acknowledgeHitl: () => set({ hitlAcknowledged: true }),

  fetchKnowledge: async () => {
    try {
      const res = await listKnowledge();
      set({ knowledgeItems: res.items });
    } catch {
      // non-critical - leave list as-is
    }
  },

  uploadFile: async (file) => {
    set({ isUploading: true, uploadError: null });
    try {
      await uploadKnowledgeFile(file);
      await get().fetchKnowledge();
      set({ isUploading: false });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Upload failed";
      set({ isUploading: false, uploadError: message });
    }
  },

  uploadUrl: async (url) => {
    set({ isUploading: true, uploadError: null });
    try {
      await uploadKnowledgeUrl(url);
      await get().fetchKnowledge();
      set({ isUploading: false });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Upload failed";
      set({ isUploading: false, uploadError: message });
    }
  },

  uploadText: async (text, title) => {
    set({ isUploading: true, uploadError: null });
    try {
      await uploadKnowledgeText(text, title);
      await get().fetchKnowledge();
      set({ isUploading: false });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Upload failed";
      set({ isUploading: false, uploadError: message });
    }
  },

  reset: () =>
    set({
      queryText: "",
      ...clearResults(),
      isRegenerating: false,
      improvingClaimId: null,
      simplifyingClaimId: null,
      status: "idle",
      errorMessage: null,
    }),
}));
