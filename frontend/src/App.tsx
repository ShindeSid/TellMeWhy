import { useEffect, useState } from "react";

import { AnswerPanel } from "@/components/AnswerPanel";
import { AuthModal } from "@/components/AuthModal";
import { ClaimVerificationPanel } from "@/components/ClaimVerificationPanel";
import { ConfidenceDropModal } from "@/components/ConfidenceDropModal";
import { ConfidenceEvolutionChart } from "@/components/ConfidenceEvolutionChart";
import { ContradictionPanel } from "@/components/ContradictionPanel";
import { DemoModeBar } from "@/components/DemoModeBar";
import { GraphOfThought } from "@/components/GraphOfThought";
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
import { useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

function SectionHeading({ children }: { children: string }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{children}</h2>;
}

function QuestionAndAnswer() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <DemoModeBar />

      <section className="flex flex-col gap-3">
        <QueryComposer />
        <TrustSliderControl />
        <KnowledgeUploadPanel />
      </section>

      <QueryUnderstandingPanel />

      <section aria-label="Routing decision" className="flex flex-col gap-2">
        <SectionHeading>How it's answering</SectionHeading>
        <RoutingSummary />
      </section>

      <section aria-label="Answer" className="flex flex-col gap-2">
        <SectionHeading>Answer</SectionHeading>
        <AnswerPanel />
        <WhyNotPanel />
      </section>
    </div>
  );
}

function ReasoningColumn() {
  const status = useWorkspaceStore((s) => s.status);

  if (status === "idle" || status === "error") {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
        The reasoning behind the answer - sources, fact-checks, and confidence over time - will
        appear here once you ask something.
      </div>
    );
  }

  // "routing" and "generating" both render this too, live - each panel
  // below already no-ops until it has real data, so this fills in
  // incrementally as backend events arrive instead of waiting for "ready".
  return (
    <div className="flex flex-col gap-4 pb-6">
      <section aria-label="Evidence" className="flex flex-col gap-4">
        <SectionHeading>Evidence &amp; verification</SectionHeading>
        <ClaimVerificationPanel />
        <SourcesPanel />
        <ContradictionPanel />
      </section>

      <section aria-label="Reasoning process" className="flex flex-col gap-4">
        <SectionHeading>Reasoning process</SectionHeading>
        <GraphOfThought />
        <ReasoningTimeline />
        <ConfidenceEvolutionChart />
      </section>

      <section aria-label="Overall trust" className="flex flex-col gap-2">
        <SectionHeading>Overall trust</SectionHeading>
        <TrustDashboard />
        <TrustCalibrationCoach />
      </section>
    </div>
  );
}

function WorkspaceHeader() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [showAuth, setShowAuth] = useState(false);

  return (
    <header className="flex shrink-0 items-start justify-between px-4 pt-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">TellMeWhy</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Ask a question and see not just the answer, but why you should (or shouldn't) trust it.
        </p>
      </div>
      <div className="pt-1 text-sm">
        {user ? (
          <div className="flex items-center gap-2 text-neutral-500">
            <span>{user.email}</span>
            <button type="button" onClick={() => void logout()} className="font-medium text-neutral-700 underline hover:text-neutral-900">
              Sign out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAuth(true)}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 font-medium hover:bg-neutral-100"
          >
            Sign in
          </button>
        )}
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </header>
  );
}

function Workspace() {
  const status = useWorkspaceStore((s) => s.status);
  const liveStage = useWorkspaceStore((s) => s.liveStage);

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      <WorkspaceHeader />

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

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  // A returning signed-in user skips straight past the landing page.
  useEffect(() => {
    if (user) setHasEntered(true);
  }, [user]);

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

  return <Workspace />;
}
