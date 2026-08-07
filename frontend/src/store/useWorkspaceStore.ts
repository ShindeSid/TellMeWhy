import { create } from "zustand";

import {
  ApiRequestError,
  createQuery,
  getClaims,
  getQuery,
  getReasoningTimeline,
  getTrustDashboard,
  listGenerations,
  listKnowledge,
  listSources,
  resumeRun as apiResumeRun,
  runDemoScenario,
  runEventsUrl,
  setSourceEnabled,
  simplifyClaim,
  startRun,
  uploadKnowledgeFile,
  deleteKnowledgeItem,
  uploadKnowledgeText,
  uploadKnowledgeUrl,
} from "@/lib/api";
import type { RunMode } from "@/lib/api";
import { openEventStream } from "@/lib/sse";
import type {
  AnswerRecord,
  Claim,
  ClaimStatus,
  ConfidenceEvent,
  KnowledgeItem,
  QueryUnderstanding,
  ReasoningStep,
  RoutingDecision,
  SourceRecord,
  TrustScoreRecord,
} from "@/types/api";

const LIVE_STAGE_LABEL: Record<string, string> = {
  QUERY_RECEIVED: "Understanding your question...",
  KAN_COMPLETED: "Running KAN router...",
  RETRIEVAL_STARTED: "Searching trusted sources...",
  RETRIEVAL_COMPLETED: "Ranking evidence...",
  GENERATING_RESPONSE: "Generating response...",
  REASONING_COMPLETED: "Draft answer ready...",
  CLAIM_EXTRACTION_STARTED: "Extracting claims...",
  TRUST_UPDATED: "Calculating trust...",
  ANSWER_COMPLETED: "Answer completed.",
  RAG_UPDATED: "Re-checking sources...",
};

// One in-flight stream cleanup handle at a time - a new run always
// supersedes whatever was streaming before.
let closeActiveStream: (() => void) | null = null;

export type WorkspaceStatus = "idle" | "routing" | "generating" | "ready" | "error";

export interface ConfidenceDropInfo {
  previous: number;
  current: number;
  stage: string;
  reason: string;
  completedStages: string[];
  timeoutSeconds: number;
}

export interface ConfidenceRecoveryInfo {
  previous: number;
  current: number;
  delta: number;
  reason: string;
}

interface WorkspaceState {
  queryText: string;
  trustSliderValue: number;

  queryId: string | null;
  activeRunId: string | null;
  understanding: QueryUnderstanding | null;
  understandingDismissed: boolean;
  routingDecision: RoutingDecision | null;
  answer: AnswerRecord | null;
  streamingAnswerText: string;
  reasoningSteps: ReasoningStep[];
  confidenceEvents: ConfidenceEvent[];
  trustScore: TrustScoreRecord | null;
  claims: Claim[];
  sources: SourceRecord[];
  generationCount: number;
  liveStage: string | null;
  isRegenerating: boolean;
  improvingClaimId: string | null;
  simplifiedClaims: Record<string, string>;
  simplifyingClaimId: string | null;
  hitlAcknowledged: boolean;

  confidenceDrop: ConfidenceDropInfo | null;
  confidenceRecovery: ConfidenceRecoveryInfo | null;
  isResuming: boolean;

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
  resumeRun: (sourceAdded: boolean) => Promise<void>;
  dismissUnderstanding: () => void;
  acknowledgeHitl: () => void;
  fetchKnowledge: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  uploadUrl: (url: string) => Promise<void>;
  uploadText: (text: string, title?: string) => Promise<void>;
  deleteKnowledgeItem: (itemId: string) => Promise<void>;
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
  | "streamingAnswerText"
  | "routingDecision"
  | "queryId"
  | "activeRunId"
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
  | "liveStage"
  | "confidenceDrop"
  | "confidenceRecovery"
> {
  return {
    answer: null,
    streamingAnswerText: "",
    routingDecision: null,
    queryId: null,
    activeRunId: null,
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
    liveStage: null,
    confidenceDrop: null,
    confidenceRecovery: null,
  };
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  /**
   * Shared by submitQuery/regenerate/improveClaim - every entry point into
   * the streaming pipeline attaches the same event handlers to the same
   * store fields. The three callers only differ in which "busy" flag they
   * set/clear and what generation_number the fresh reasoningSteps/claims
   * arrays should be tagged with while events are still live-arriving
   * (before the authoritative settle-refetch replaces them).
   */
  function attachRunStream(
    queryId: string,
    runId: string,
    generationNumber: number,
    onSettle: (status: WorkspaceStatus) => void,
    onError: (message: string) => void
  ): void {
    let stepOrder = 0;
    set({ streamingAnswerText: "" });

    closeActiveStream = openEventStream(runEventsUrl(runId), {
      KAN_COMPLETED: () => set({ liveStage: LIVE_STAGE_LABEL.KAN_COMPLETED }),

      RETRIEVAL_STARTED: () => set({ liveStage: LIVE_STAGE_LABEL.RETRIEVAL_STARTED }),

      SOURCE_RETRIEVED: (data) =>
        set((state) => ({
          liveStage: `Found: ${data.title as string}`,
          sources: [
            ...state.sources,
            {
              id: `live-${state.sources.length}`,
              query_id: queryId,
              title: (data.title as string) ?? null,
              url_or_path: (data.url as string) ?? null,
              content: null,
              similarity: (data.similarity as number) ?? null,
              freshness_days: null,
              reliability_score: null,
              contribution_score: (data.similarity as number) ?? null,
              enabled: true,
              rejected: false,
              rejection_reason: null,
              created_at: new Date().toISOString(),
            },
          ],
        })),

      RETRIEVAL_COMPLETED: () => set({ liveStage: LIVE_STAGE_LABEL.RETRIEVAL_COMPLETED }),

      RAG_UPDATED: () => set({ liveStage: LIVE_STAGE_LABEL.RAG_UPDATED }),

      GENERATING_RESPONSE: () => set({ liveStage: LIVE_STAGE_LABEL.GENERATING_RESPONSE, streamingAnswerText: "" }),

      ANSWER_CHUNK: (data) =>
        set((state) => ({ streamingAnswerText: state.streamingAnswerText + (data.text as string) })),

      CONFIDENCE_UPDATED: (data) =>
        set((state) => {
          const confidence = data.confidence as number;
          const step: ReasoningStep = {
            id: `live-step-${stepOrder}`,
            query_id: queryId,
            generation_number: generationNumber,
            stage: data.stage as string,
            step_order: stepOrder++,
            summary: data.summary as string,
            confidence,
            created_at: new Date().toISOString(),
          };
          const events = [...state.confidenceEvents];
          if ((data.confidence_delta as number) !== 0) {
            events.push({
              id: `live-event-${events.length}`,
              query_id: queryId,
              generation_number: generationNumber,
              reasoning_step_id: step.id,
              confidence_before: data.confidence_before as number,
              confidence_after: confidence,
              reason: `${data.stage as string}: ${data.summary as string}`,
              created_at: new Date().toISOString(),
            });
          }
          return { reasoningSteps: [...state.reasoningSteps, step], confidenceEvents: events };
        }),

      REASONING_COMPLETED: () => set({ liveStage: LIVE_STAGE_LABEL.REASONING_COMPLETED }),

      CLAIM_EXTRACTION_STARTED: () => set({ liveStage: LIVE_STAGE_LABEL.CLAIM_EXTRACTION_STARTED }),

      CLAIM_VERIFIED: (data) =>
        set((state) => ({
          liveStage: "Verifying claims...",
          claims: [
            ...state.claims,
            {
              id: data.claim_id as string,
              query_id: queryId,
              generation_number: generationNumber,
              text: data.text as string,
              status: data.status as ClaimStatus,
              verification_notes: (data.notes as string) ?? null,
              span_start: (data.span_start as number) ?? null,
              span_end: (data.span_end as number) ?? null,
              created_at: new Date().toISOString(),
            },
          ],
        })),

      // --- Human-in-the-Loop (Feature 2) ---
      CONFIDENCE_DROP: (data) =>
        set({
          liveStage: "Confidence dropped - waiting for you...",
          confidenceDrop: {
            previous: data.previous as number,
            current: data.current as number,
            stage: data.stage as string,
            reason: data.reason as string,
            completedStages: (data.completed_stages as string[]) ?? [],
            timeoutSeconds: 5,
          },
        }),

      WAITING_FOR_USER_INPUT: (data) =>
        set((state) => ({
          confidenceDrop: state.confidenceDrop
            ? { ...state.confidenceDrop, timeoutSeconds: (data.timeout_seconds as number) ?? 5 }
            : state.confidenceDrop,
        })),

      USER_SOURCE_UPLOADED: () => set({ liveStage: "Source received - re-checking..." }),

      CONFIDENCE_RECOVERED: (data) =>
        set({
          confidenceRecovery: {
            previous: data.previous as number,
            current: data.current as number,
            delta: data.delta as number,
            reason: data.reason as string,
          },
        }),

      // hitlAcknowledged=true here too: the user already saw the richer
      // collaborative confidence-drop modal for this generation (or its
      // timeout played out in front of them) - the older, simpler "low
      // confidence, continue?" gate in AnswerPanel would otherwise fire
      // again immediately after for the same underlying reason.
      REASONING_RESUMED: () => set({ confidenceDrop: null, isResuming: false, hitlAcknowledged: true }),

      TRUST_UPDATED: (data) =>
        set({
          liveStage: LIVE_STAGE_LABEL.TRUST_UPDATED,
          trustScore: {
            id: "live-trust",
            query_id: queryId,
            generation_number: generationNumber,
            overall_trust: data.overall_trust as number,
            verification_score: (data.verification_score as number) ?? null,
            freshness_score: null,
            reasoning_depth_score: (data.reasoning_depth_score as number) ?? null,
            plain_english_summary: (data.plain_english_summary as string) ?? null,
            created_at: new Date().toISOString(),
          },
        }),

      ANSWER_COMPLETED: (data) => {
        set({
          liveStage: LIVE_STAGE_LABEL.ANSWER_COMPLETED,
          answer: {
            id: data.answer_id as string,
            query_id: queryId,
            generation_number: data.generation_number as number,
            text: data.text as string,
            route_used: data.route_used as AnswerRecord["route_used"],
            created_at: new Date().toISOString(),
          },
        });
        // Settle: replace the live-synthesized arrays with the authoritative
        // DB records (exact same shape the non-streaming path produces), so
        // nothing downstream (Reasoning Sandbox, regenerate) can tell the
        // difference between a streamed and non-streamed answer.
        void fetchGenerationArtifacts(queryId).then(
          ({ timeline, trust, claimsResponse, sourcesResponse, generations }) => {
            set({
              reasoningSteps: timeline.steps,
              confidenceEvents: timeline.confidence_events,
              trustScore: trust.trust_score,
              claims: claimsResponse.claims,
              sources: sourcesResponse.sources,
              generationCount: generations.generations.length,
            });
            onSettle("ready");
          }
        );
        closeActiveStream?.();
        closeActiveStream = null;
      },

      ERROR: (data) => {
        onError((data.detail as string) ?? "Something went wrong");
        closeActiveStream?.();
        closeActiveStream = null;
      },
    });
  }

  async function runStreaming(
    queryId: string,
    mode: RunMode,
    generationNumber: number,
    claimId: string | undefined,
    onSettle: (status: WorkspaceStatus) => void,
    onError: (message: string) => void
  ): Promise<void> {
    const { run_id } = await startRun(queryId, mode, claimId);
    set({ activeRunId: run_id });
    attachRunStream(queryId, run_id, generationNumber, onSettle, onError);
  }

  return {
    queryText: "",
    trustSliderValue: 0.5,

    ...clearResults(),
    isRegenerating: false,
    improvingClaimId: null,
    simplifyingClaimId: null,
    isResuming: false,

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

      closeActiveStream?.();
      set({ status: "routing", errorMessage: null, ...clearResults() });

      try {
        // KAN routing + Query Understanding already happen synchronously here
        // and already return fast (no streaming benefit from wrapping this
        // call too) - see docs/architecture.md.
        const created = await createQuery(queryText, trustSliderValue, knowledgeItems.length > 0);
        const queryId = created.query_id;
        set({
          queryId,
          routingDecision: created.routing_decision,
          understanding: created.understanding,
          status: "generating",
          liveStage: LIVE_STAGE_LABEL.KAN_COMPLETED,
        });

        await runStreaming(
          queryId,
          "answer",
          1,
          undefined,
          (status) => set({ status }),
          (message) => set({ status: "error", errorMessage: message })
        );
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
      const { queryId, generationCount } = get();
      if (!queryId) return;

      closeActiveStream?.();
      set({
        isRegenerating: true,
        errorMessage: null,
        claims: [],
        sources: get().sources.filter((s) => s.enabled), // keep enabled sources visible while claims re-stream in
        simplifiedClaims: {},
        hitlAcknowledged: false,
        confidenceRecovery: null,
      });

      try {
        await runStreaming(
          queryId,
          "regenerate",
          generationCount + 1,
          undefined,
          (status) => set({ status, isRegenerating: false }),
          (message) => set({ isRegenerating: false, errorMessage: message })
        );
      } catch (err) {
        const message = err instanceof ApiRequestError ? err.message : "Unexpected error";
        set({ isRegenerating: false, errorMessage: message });
      }
    },

    improveClaim: async (claimId) => {
      const { queryId, generationCount } = get();
      if (!queryId) return;

      closeActiveStream?.();
      set({
        improvingClaimId: claimId,
        errorMessage: null,
        claims: [],
        sources: get().sources.filter((s) => s.enabled),
        simplifiedClaims: {},
        hitlAcknowledged: false,
        confidenceRecovery: null,
      });

      try {
        await runStreaming(
          queryId,
          "improve",
          generationCount + 1,
          claimId,
          (status) => set({ status, improvingClaimId: null }),
          (message) => set({ improvingClaimId: null, errorMessage: message })
        );
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

    resumeRun: async (sourceAdded) => {
      const { activeRunId } = get();
      if (!activeRunId) return;
      set({ isResuming: true });
      try {
        await apiResumeRun(activeRunId, sourceAdded);
        // REASONING_RESUMED (streamed back) clears confidenceDrop/isResuming;
        // this is just a safety net in case that event never arrives.
      } catch {
        set({ isResuming: false });
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

    deleteKnowledgeItem: async (itemId) => {
      set((state) => ({ knowledgeItems: state.knowledgeItems.filter((i) => i.id !== itemId) }));
      try {
        await deleteKnowledgeItem(itemId);
      } catch {
        await get().fetchKnowledge(); // failed - resync with server truth
      }
    },

    reset: () => {
      closeActiveStream?.();
      closeActiveStream = null;
      set({
        queryText: "",
        ...clearResults(),
        isRegenerating: false,
        improvingClaimId: null,
        simplifyingClaimId: null,
        isResuming: false,
        status: "idle",
        errorMessage: null,
      });
    },
  };
});
