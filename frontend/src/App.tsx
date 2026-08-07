import { AnswerPanel } from "@/components/AnswerPanel";
import { ClaimVerificationPanel } from "@/components/ClaimVerificationPanel";
import { ConfidenceEvolutionChart } from "@/components/ConfidenceEvolutionChart";
import { DemoModeBar } from "@/components/DemoModeBar";
import { QueryComposer } from "@/components/QueryComposer";
import { ReasoningTimeline } from "@/components/ReasoningTimeline";
import { RoutingSummary } from "@/components/RoutingSummary";
import { SourcesPanel } from "@/components/SourcesPanel";
import { TrustDashboard } from "@/components/TrustDashboard";
import { TrustSliderControl } from "@/components/TrustSliderControl";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export default function App() {
  const status = useWorkspaceStore((s) => s.status);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-lg font-semibold">TellMeWhy</h1>
        <p className="text-sm text-neutral-500">An AI reasoning workspace — see why, not just what.</p>
      </header>

      {/* Announces status changes (routing/generating/ready/error) to screen readers without visible layout. */}
      <p role="status" aria-live="polite" className="sr-only">
        {status === "routing" && "Analyzing your question."}
        {status === "generating" && "Generating an answer."}
        {status === "ready" && "Answer ready."}
        {status === "error" && "Something went wrong."}
      </p>

      <DemoModeBar />

      <section className="flex flex-col gap-3">
        <QueryComposer />
        <TrustSliderControl />
      </section>

      <section className="flex flex-col gap-4">
        <RoutingSummary />
        <AnswerPanel />
        <SourcesPanel />
        <ClaimVerificationPanel />
        <ReasoningTimeline />
        <ConfidenceEvolutionChart />
        <TrustDashboard />
      </section>
    </main>
  );
}
