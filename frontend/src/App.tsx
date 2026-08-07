import { AnswerPanel } from "@/components/AnswerPanel";
import { ClaimVerificationPanel } from "@/components/ClaimVerificationPanel";
import { ConfidenceEvolutionChart } from "@/components/ConfidenceEvolutionChart";
import { ContradictionPanel } from "@/components/ContradictionPanel";
import { DemoModeBar } from "@/components/DemoModeBar";
import { KnowledgeUploadPanel } from "@/components/KnowledgeUploadPanel";
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

  if (status !== "ready") {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
        The reasoning behind the answer - sources, fact-checks, and confidence over time - will
        appear here once you ask something.
      </div>
    );
  }

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

export default function App() {
  const status = useWorkspaceStore((s) => s.status);

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      <header className="shrink-0 px-4 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">TellMeWhy</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Ask a question and see not just the answer, but why you should (or shouldn't) trust it.
        </p>
      </header>

      {/* Announces status changes (routing/generating/ready/error) to screen readers without visible layout. */}
      <p role="status" aria-live="polite" className="sr-only">
        {status === "routing" && "Analyzing your question."}
        {status === "generating" && "Generating an answer."}
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
    </div>
  );
}
