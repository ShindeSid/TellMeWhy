import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { STATUS_BORDER_CLASS, STATUS_ICON, STATUS_LABEL, STATUS_TEXT_CLASS } from "@/lib/claimStatus";

export function ClaimVerificationPanel() {
  const claims = useWorkspaceStore((s) => s.claims);
  const status = useWorkspaceStore((s) => s.status);

  if (status !== "ready" || claims.length === 0) return null;

  const verifiedCount = claims.filter((c) => c.status === "verified").length;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold">Fact-check breakdown</h2>
        <p className="text-xs text-neutral-500">
          {verifiedCount} of {claims.length} statement{claims.length === 1 ? "" : "s"} in the answer
          {" "}could be matched to the sources used.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {claims.map((claim) => (
          <li
            key={claim.id}
            className={`rounded-lg border p-2.5 text-sm ${STATUS_BORDER_CLASS[claim.status]}`}
          >
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 shrink-0 font-semibold ${STATUS_TEXT_CLASS[claim.status]}`} aria-hidden="true">
                {STATUS_ICON[claim.status]}
              </span>
              <div className="min-w-0">
                <p>{claim.text}</p>
                <p className={`mt-1 text-xs font-medium ${STATUS_TEXT_CLASS[claim.status]}`}>
                  {STATUS_LABEL[claim.status]}
                </p>
                {claim.verification_notes && (
                  <p className="mt-0.5 text-xs text-neutral-500">{claim.verification_notes}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
