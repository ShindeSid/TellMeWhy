import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function WhyNotPanel() {
  const status = useWorkspaceStore((s) => s.status);
  const trustScore = useWorkspaceStore((s) => s.trustScore);
  const claims = useWorkspaceStore((s) => s.claims);
  const decision = useWorkspaceStore((s) => s.routingDecision);
  const trustSliderValue = useWorkspaceStore((s) => s.trustSliderValue);

  if (status !== "ready" || !trustScore) return null;
  if (trustScore.overall_trust >= 0.95) return null;

  const reasons: string[] = [];

  const unsupported = claims.filter((c) => c.status === "unsupported");
  const weak = claims.filter((c) => c.status === "weak");

  if (unsupported.length > 0) {
    reasons.push(
      `${unsupported.length} statement${unsupported.length === 1 ? "" : "s"} in the answer couldn't be matched to any source - it may be the model's own assumption rather than a checked fact.`
    );
  }
  if (weak.length > 0) {
    reasons.push(
      `${weak.length} statement${weak.length === 1 ? "" : "s"} were only loosely supported by the sources used.`
    );
  }
  if (trustScore.verification_score === null) {
    reasons.push("No outside sources were checked against this answer, so nothing here has been independently verified.");
  }
  if (decision?.hallucination_risk === "high") {
    reasons.push("The router flagged this type of question as higher-risk for the model making things up.");
  } else if (decision?.hallucination_risk === "medium") {
    reasons.push("The router flagged some risk of the model making up small details for this type of question.");
  }
  if (trustSliderValue < 0.4) {
    reasons.push("Your slider was set toward \"Fast,\" which trades off some thoroughness for speed.");
  }

  if (reasons.length === 0) {
    reasons.push("The router's own confidence estimate for this type of question was moderate to begin with.");
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
        <span aria-hidden="true">💡</span> Why isn't this more confident?
      </h2>
      <ul className="flex flex-col gap-1.5 text-sm text-amber-900">
        {reasons.map((reason, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{reason}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-amber-700">
        Tip: move the Trust Slider toward "Reliable" and ask again, or check the sources yourself
        before relying on this answer.
      </p>
    </div>
  );
}
