import { useWorkspaceStore } from "@/store/useWorkspaceStore";

function coachingFor(value: number): { band: string; advice: string } {
  if (value >= 0.8) {
    return {
      band: "High",
      advice:
        "Scores this high mean most of the answer's specific claims were checked and matched the sources. Still worth a skim for anything that sounds surprising - no check here is a substitute for domain expertise on anything high-stakes.",
    };
  }
  if (value >= 0.55) {
    return {
      band: "Medium",
      advice:
        "Scores in this range usually mean part of the answer checked out and part didn't, or nothing was cross-checked at all. Treat it as a reasonable starting point, not a settled fact - verify anything you'd act on.",
    };
  }
  return {
    band: "Low",
    advice:
      "Scores this low mean the system itself isn't confident this holds up - either several claims failed verification, or there wasn't much to check against. Don't treat this as reliable without independent verification.",
  };
}

export function TrustCalibrationCoach() {
  const status = useWorkspaceStore((s) => s.status);
  const trustScore = useWorkspaceStore((s) => s.trustScore);

  if (status !== "ready" || !trustScore) return null;

  const { band, advice } = coachingFor(trustScore.overall_trust);

  return (
    <details className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer select-none text-sm font-semibold">
        What does {Math.round(trustScore.overall_trust * 100)}% actually mean?
      </summary>
      <p className="mt-2 text-sm text-neutral-600">
        <span className="font-medium">{band} confidence.</span> {advice}
      </p>
    </details>
  );
}
