import { formatPercent } from "@/lib/format";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

function trustColor(value: number): string {
  if (value >= 0.7) return "text-trust-high";
  if (value >= 0.4) return "text-trust-medium";
  return "text-trust-low";
}

function trustRingColor(value: number): string {
  if (value >= 0.7) return "#15803d";
  if (value >= 0.4) return "#a16207";
  return "#c2410c";
}

function TrustGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value);

  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0" role="img" aria-label={`Overall trust ${pct} percent`}>
      <circle cx="44" cy="44" r={radius} fill="none" stroke="#e5e5e5" strokeWidth="8" />
      <circle
        cx="44"
        cy="44"
        r={radius}
        fill="none"
        stroke={trustRingColor(value)}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="49" textAnchor="middle" fontSize="18" fontWeight="600" fill="#171717">
        {pct}%
      </text>
    </svg>
  );
}

export function TrustDashboard() {
  const trustScore = useWorkspaceStore((s) => s.trustScore);
  const status = useWorkspaceStore((s) => s.status);

  if (status !== "ready") return null;

  if (!trustScore) {
    return (
      <p className="rounded-xl border border-neutral-200 bg-white p-4 text-xs text-neutral-400 shadow-sm">
        No trust score available for this answer yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold">How much should you trust this?</h2>
      <div className="flex items-center gap-4">
        <TrustGauge value={trustScore.overall_trust} />
        <p className={`text-sm ${trustColor(trustScore.overall_trust)}`}>
          {trustScore.plain_english_summary}
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center text-xs text-neutral-500">
        <div className="rounded-lg bg-neutral-50 p-2">
          <dt>Fact-checked</dt>
          <dd className="mt-0.5 text-sm font-semibold text-neutral-900">
            {trustScore.verification_score !== null ? formatPercent(trustScore.verification_score) : "n/a"}
          </dd>
        </div>
        <div className="rounded-lg bg-neutral-50 p-2">
          <dt>Up to date</dt>
          <dd className="mt-0.5 text-sm font-semibold text-neutral-900">
            {trustScore.freshness_score !== null ? formatPercent(trustScore.freshness_score) : "n/a"}
          </dd>
        </div>
        <div className="rounded-lg bg-neutral-50 p-2">
          <dt>How thorough</dt>
          <dd className="mt-0.5 text-sm font-semibold text-neutral-900">
            {formatPercent(trustScore.reasoning_depth_score ?? 0)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
