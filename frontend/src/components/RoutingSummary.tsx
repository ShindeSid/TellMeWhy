import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const ROUTE_LABEL: Record<string, string> = {
  small_llm: "Small model",
  large_llm: "Large model",
  rag: "Retrieval + model",
};

export function RoutingSummary() {
  const decision = useWorkspaceStore((s) => s.routingDecision);
  const status = useWorkspaceStore((s) => s.status);

  if (status === "idle") return null;

  if (!decision) {
    return <p className="text-sm text-neutral-500">Deciding how to route this...</p>;
  }

  return (
    <div className="rounded border border-neutral-200 p-3 text-sm">
      <p className="font-medium">{ROUTE_LABEL[decision.route] ?? decision.route}</p>
      <p className="mt-1 text-neutral-500">{decision.rationale}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-600">
        <dt>Complexity</dt>
        <dd>{decision.complexity_score.toFixed(2)}</dd>
        <dt>Ambiguity</dt>
        <dd>{decision.ambiguity_score.toFixed(2)}</dd>
        <dt>Hallucination risk</dt>
        <dd>{decision.hallucination_risk}</dd>
        <dt>Expected confidence</dt>
        <dd>{decision.expected_confidence?.toFixed(2) ?? "—"}</dd>
      </dl>
    </div>
  );
}
