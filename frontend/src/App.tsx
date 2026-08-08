import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { AnswerPanel } from "@/components/AnswerPanel";
import { AuthModal } from "@/components/AuthModal";
import { ClaimVerificationPanel } from "@/components/ClaimVerificationPanel";
import { ConfidenceDropModal } from "@/components/ConfidenceDropModal";
import { ConfidenceEvolutionChart } from "@/components/ConfidenceEvolutionChart";
import { ContradictionPanel } from "@/components/ContradictionPanel";
import { DecisionCard } from "@/components/DecisionCard";
import { GraphOfThought } from "@/components/GraphOfThought";
import { IconSparkles } from "@/components/icons";
import { KnowledgeUploadPanel } from "@/components/KnowledgeUploadPanel";
import { LandingPage } from "@/components/LandingPage";
import { QueryComposer } from "@/components/QueryComposer";
import { QueryUnderstandingPanel } from "@/components/QueryUnderstandingPanel";
import { ReasoningTimeline } from "@/components/ReasoningTimeline";
import { RoutingSummary } from "@/components/RoutingSummary";
import { SourcesPanel } from "@/components/SourcesPanel";
import { SplitPane } from "@/components/SplitPane";
import { TrustCalibrationCoach } from "@/components/TrustCalibrationCoach";
import { TrustDashboard } from "@/components/TrustDashboard";
import { TrustSliderControl } from "@/components/TrustSliderControl";
import { WhyNotPanel } from "@/components/WhyNotPanel";
import { formatPercent } from "@/lib/format";
import { useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { ChatTurn } from "@/store/useWorkspaceStore";

const ACCENT_DOT_CLASS = {
  brand: "bg-brand-500",
  teal: "bg-teal-500",
  amber: "bg-amber-500",
} as const;

function SectionHeading({
  children,
  accent = "brand",
}: {
  children: string;
  accent?: keyof typeof ACCENT_DOT_CLASS;
}) {
  return (
    <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
      <span className={`h-1.5 w-1.5 rounded-full ${ACCENT_DOT_CLASS[accent]}`} aria-hidden="true" />
      {children}
    </h2>
  );
}

const STARTER_PROMPTS = [
  "What does the latest research say about intermittent fasting and metabolic health?",
  "Explain how transformer attention mechanisms work, with sources.",
  "What are the main arguments in the current debate over AI regulation?",
];

function EmptyState() {
  const setQueryText = useWorkspaceStore((s) => s.setQueryText);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-700 text-white shadow-glow">
        <IconSparkles className="h-6 w-6" />
      </span>
      <div>
        <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Ask a research question to get started
        </p>
        <p className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
          Every claim gets checked against real sources - watch the reasoning happen, not just the
          answer appear.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              setQueryText(prompt);
              document.getElementById("query-input")?.focus();
            }}
            className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-left text-xs text-neutral-600 dark:text-neutral-300 shadow-card transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-brand-500 dark:hover:bg-neutral-700"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatMessage({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-gradient-to-br from-brand-600 to-indigo-700 px-4 py-2.5 text-sm text-white shadow-card">
          {children}
        </div>
      </div>
    );
  }
  return <div className="flex flex-col gap-3">{children}</div>;
}

function trustTextClass(value: number): string {
  if (value >= 0.7) return "text-trust-high";
  if (value >= 0.4) return "text-trust-medium";
  return "text-trust-low";
}

// Past turns are read-only recaps in the chat log, not full interactive
// panels - claim highlighting/evidence stays exclusive to the active turn
// (shown live in the reasoning column) to keep this scoped and fast.
function HistoryTurn({ turn }: { turn: ChatTurn }) {
  return (
    <div className="flex flex-col gap-2">
      <ChatMessage role="user">{turn.queryText}</ChatMessage>
      <ChatMessage role="assistant">
        <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-card dark:border-neutral-700/70 dark:bg-neutral-800">
          {turn.decision && (
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {turn.decision.recommendation}
            </p>
          )}
          {turn.answer && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              {turn.answer.text}
            </p>
          )}
          {turn.trustScore && (
            <p className={`mt-2 text-xs font-medium ${trustTextClass(turn.trustScore.overall_trust)}`}>
              Trust: {formatPercent(turn.trustScore.overall_trust)}
            </p>
          )}
        </div>
      </ChatMessage>
    </div>
  );
}

function ActiveTurn() {
  const status = useWorkspaceStore((s) => s.status);
  const activeQueryText = useWorkspaceStore((s) => s.activeQueryText);

  if (status === "idle" || status === "error") return null;

  return (
    <div className="flex flex-col gap-4">
      {activeQueryText && <ChatMessage role="user">{activeQueryText}</ChatMessage>}
      <ChatMessage role="assistant">
        <AnswerPanel />
      </ChatMessage>
    </div>
  );
}


function QuestionAndAnswer() {
  const history = useWorkspaceStore((s) => s.history);
  const status = useWorkspaceStore((s) => s.status);
  const streamingAnswerText = useWorkspaceStore((s) => s.streamingAnswerText);
  const decision = useWorkspaceStore((s) => s.decision);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [history.length, status, streamingAnswerText, decision]);

  const isEmpty = history.length === 0 && status === "idle";

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-6 pb-4 pt-1">
            {history.map((turn) => (
              <HistoryTurn key={turn.id} turn={turn} />
            ))}
            <ActiveTurn />
          </div>
        )}
      </div>

      <div className="shrink-0 pt-3">
        <div className="flex flex-col gap-2">
          <QueryComposer />
          <TrustSliderControl />
        </div>
      </div>
    </div>
  );
}

function ReasoningColumn() {
  const status = useWorkspaceStore((s) => s.status);

  if (status === "idle" || status === "error") {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400 dark:text-neutral-500 dark:border-neutral-700 dark:text-neutral-500">
        The reasoning behind the answer - sources, fact-checks, and confidence over time - will
        appear here once you ask something.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Live reasoning graph — always visible while thinking */}
      <section aria-label="Reasoning process" className="flex flex-col gap-2">
        <SectionHeading>Watching it think</SectionHeading>
        <GraphOfThought />
      </section>

      {/* Answer routing summary */}
      <details className="rounded-2xl border border-neutral-200/70 bg-white shadow-card dark:border-neutral-700/70 dark:bg-neutral-800">
        <summary className="cursor-pointer select-none rounded-2xl px-4 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60">
          How it answered &amp; decision
        </summary>
        <div className="flex flex-col gap-4 border-t border-neutral-100 p-4 dark:border-neutral-700">
          <QueryUnderstandingPanel />
          <section aria-label="Routing decision" className="flex flex-col gap-2">
            <SectionHeading>Routing</SectionHeading>
            <RoutingSummary />
          </section>
          <DecisionCard />
          <WhyNotPanel />
        </div>
      </details>

      {/* Reasoning internals — collapsed by default */}
      <details className="rounded-2xl border border-neutral-200/70 bg-white shadow-card dark:border-neutral-700/70 dark:bg-neutral-800">
        <summary className="cursor-pointer select-none rounded-2xl px-4 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60">
          Confidence timeline &amp; trust breakdown
        </summary>
        <div className="flex flex-col gap-4 border-t border-neutral-100 p-4 dark:border-neutral-700">
          <section aria-label="Reasoning timeline" className="flex flex-col gap-4">
            <SectionHeading>Reasoning timeline</SectionHeading>
            <ReasoningTimeline />
            <ConfidenceEvolutionChart />
          </section>
          <section aria-label="Overall trust" className="flex flex-col gap-2">
            <SectionHeading>Overall trust</SectionHeading>
            <TrustDashboard />
            <TrustCalibrationCoach />
          </section>
        </div>
      </details>

      {/* Evidence & Verification — collapsed at the very bottom */}
      <details className="rounded-2xl border border-neutral-200/70 bg-white shadow-card dark:border-neutral-700/70 dark:bg-neutral-800">
        <summary className="cursor-pointer select-none rounded-2xl px-4 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60">
          Evidence &amp; verification
        </summary>
        <div className="flex flex-col gap-4 border-t border-neutral-100 p-4 dark:border-neutral-700">
          <section aria-label="Evidence" className="flex flex-col gap-4">
            <ClaimVerificationPanel />
            <SourcesPanel />
            <ContradictionPanel />
          </section>
        </div>
      </details>
    </div>
  );
}

function WorkspaceHeader({ onExit }: { onExit: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [showAuth, setShowAuth] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const knowledgeItems = useWorkspaceStore((s) => s.knowledgeItems);

  return (
    <header className="shrink-0 px-4 pt-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-gradient-to-r from-neutral-950 via-brand-900 to-indigo-900 px-5 py-3.5 shadow-glow">
        <button
          type="button"
          onClick={onExit}
          aria-label="Back to dashboard"
          className="flex cursor-pointer items-center justify-self-start rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white ring-1 ring-white/20"
          >
            T
          </span>
        </button>

        <button
          type="button"
          onClick={onExit}
          className="flex cursor-pointer flex-col items-center justify-self-center rounded-lg text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <h1 className="text-lg font-bold leading-tight tracking-tight text-white">TellMeWhy</h1>
          <p className="hidden text-xs text-brand-200/80 sm:block">
            See not just the answer, but why you should trust it.
          </p>
        </button>

        <div className="flex items-center gap-3 justify-self-end text-sm">
          {/* Resources popover button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowResources((v) => !v)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-expanded={showResources}
              aria-label="Toggle resources panel"
            >
              <span>{showResources ? "−" : "+"}</span>
              <span>Resources</span>
              {knowledgeItems.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-400 text-[10px] font-bold text-white">
                  {knowledgeItems.length}
                </span>
              )}
            </button>

            {showResources && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl shadow-xl ring-1 ring-black/10">
                <KnowledgeUploadPanel defaultExpanded />
              </div>
            )}
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-brand-100/80 sm:inline">{user.email}</span>
              <button
                type="button"
                onClick={() => void logout()}
                className="cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="cursor-pointer rounded-lg border border-white/15 bg-white/10 px-3.5 py-1.5 font-medium text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </header>
  );
}

function Workspace({ onExit }: { onExit: () => void }) {
  const status = useWorkspaceStore((s) => s.status);
  const liveStage = useWorkspaceStore((s) => s.liveStage);

  return (
    <div className="flex h-screen flex-col bg-app-gradient dark:bg-neutral-950">
      <WorkspaceHeader onExit={onExit} />

      {/* Announces live backend progress to screen readers without visible layout - not a static message. */}
      <p role="status" aria-live="polite" className="sr-only">
        {status === "routing" && "Analyzing your question."}
        {status === "generating" && (liveStage ?? "Generating an answer.")}
        {status === "ready" && "Answer ready."}
        {status === "error" && "Something went wrong."}
      </p>

      <div className="min-h-0 flex-1 px-4 pt-4">
        <SplitPane
          leftLabel="Question and answer"
          rightLabel="Reasoning"
          left={<QuestionAndAnswer />}
          right={<ReasoningColumn />}
        />
      </div>

      <ConfidenceDropModal />
    </div>
  );
}

export default function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null);
  const user = useAuthStore((s) => s.user);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const resetWorkspace = useWorkspaceStore((s) => s.reset);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  // Force theme per page: landing is always dark, workspace is always light.
  useEffect(() => {
    if (hasEntered) {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, [hasEntered]);

  // A returning signed-in user skips straight past the landing page.
  useEffect(() => {
    if (user) setHasEntered(true);
  }, [user]);

  // Signed-in users have no separate marketing landing page to return to -
  // for them the workspace itself is "the dashboard", so exiting just clears
  // the current session back to a blank slate instead of a no-op bounce
  // (the effect above would immediately re-enter otherwise).
  const handleExitToDashboard = () => {
    resetWorkspace();
    if (!user) setHasEntered(false);
  };

  if (!hasEntered) {
    return (
      <>
        <LandingPage onEnterGuest={() => setHasEntered(true)} onOpenAuth={setAuthMode} />
        {/* Closing this only dismisses it - the `user` effect above handles
            entering the workspace once auth actually succeeds, so a cancel
            (X / backdrop click) correctly leaves the user on the landing page. */}
        {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />}
      </>
    );
  }

  return <Workspace onExit={handleExitToDashboard} />;
}
