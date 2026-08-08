import { formatPercent } from "@/lib/format";
import { classifyComplexity } from "@/lib/kanClassifier";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { RiskLevel, Route } from "@/types/api";

const TIER_CLASS: Record<string, string> = {
  Simple: "bg-trust-high/10 text-trust-high",
  Moderate: "bg-blue-100 text-blue-700",
  Complex: "bg-trust-medium/10 text-trust-medium",
  Expert: "bg-trust-low/10 text-trust-low",
};

const ROUTE_LABEL: Record<Route, string> = {
  small_llm: "A fast, lightweight model",
  large_llm: "A larger, more capable model",
  rag: "Search + a model to summarize what it finds",
};

const ROUTE_WHY: Record<Route, string> = {
  small_llm: "This looked like a simple question, so speed was prioritized.",
  large_llm: "This looked complex enough to need more careful reasoning.",
  rag: "This looked like a factual question, so sources were looked up first.",
};

const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low risk of made-up details",
  medium: "Some risk of made-up details",
  high: "Higher risk of made-up details",
};

const RISK_CLASS: Record<RiskLevel, string> = {
  low: "text-trust-high bg-trust-high/10",
  medium: "text-trust-medium bg-trust-medium/10",
  high: "text-trust-low bg-trust-low/10",
};

export function RoutingSummary() {
  const decision = useWorkspaceStore((s) => s.routingDecision);
  const status = useWorkspaceStore((s) => s.status);

  if (status === "idle") return null;

  if (!decision) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Figuring out how best to answer this...</p>;
  }

  const { tier, why } = classifyComplexity(decision.complexity_score);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200/70 border-t-2 border-t-brand-400 bg-white p-4 shadow-card dark:border-neutral-700/70 dark:border-t-brand-500 dark:bg-neutral-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{ROUTE_LABEL[decision.route] ?? decision.route}</p>
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{ROUTE_WHY[decision.route] ?? decision.rationale}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${RISK_CLASS[decision.hallucination_risk]}`}>
          {RISK_LABEL[decision.hallucination_risk]}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${TIER_CLASS[tier]}`}>
          KAN classified: {tier}
        </span>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">{why}</span>
      </div>

      <details className="text-xs text-neutral-500 dark:text-neutral-400">
        <summary className="cursor-pointer select-none text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300">
          Technical details
        </summary>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          <dt>Complexity</dt>
          <dd>{formatPercent(decision.complexity_score)}</dd>
          <dt>Ambiguity</dt>
          <dd>{formatPercent(decision.ambiguity_score)}</dd>
          <dt>Expected confidence</dt>
          <dd>{formatPercent(decision.expected_confidence)}</dd>
          <dt>Reasoning</dt>
          <dd className="col-span-2 text-neutral-400 dark:text-neutral-500">{decision.rationale}</dd>
        </dl>
      </details>
    </div>
  );
}
