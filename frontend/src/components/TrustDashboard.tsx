import { useWorkspaceStore } from "@/store/useWorkspaceStore";

function trustColor(value: number): string {
  if (value >= 0.7) return "text-trust-high";
  if (value >= 0.4) return "text-trust-medium";
  return "text-trust-low";
}

export function TrustDashboard() {
  const trustScore = useWorkspaceStore((s) => s.trustScore);
  const status = useWorkspaceStore((s) => s.status);

  if (status !== "ready") return null;

  if (!trustScore) {
    return <p className="text-xs text-neutral-400">No trust score available for this answer yet.</p>;
  }

  return (
    <div className="rounded border border-neutral-200 p-3">
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-semibold ${trustColor(trustScore.overall_trust)}`}>
          {Math.round(trustScore.overall_trust * 100)}%
        </span>
        <span className="text-xs text-neutral-500">overall trust</span>
      </div>
      <p className="mt-2 text-xs text-neutral-600">{trustScore.plain_english_summary}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-500">
        <dt>Verification</dt>
        <dd>{trustScore.verification_score !== null ? `${Math.round(trustScore.verification_score * 100)}%` : "pending"}</dd>
        <dt>Freshness</dt>
        <dd>{trustScore.freshness_score !== null ? `${Math.round(trustScore.freshness_score * 100)}%` : "n/a"}</dd>
        <dt>Reasoning depth</dt>
        <dd>{Math.round((trustScore.reasoning_depth_score ?? 0) * 100)}%</dd>
      </dl>
    </div>
  );
}
