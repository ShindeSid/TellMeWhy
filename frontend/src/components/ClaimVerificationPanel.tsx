import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { ClaimStatus } from "@/types/api";

const STATUS_ICON: Record<ClaimStatus, string> = {
  verified: "✓",
  weak: "⚠",
  unsupported: "✗",
};

const STATUS_CLASS: Record<ClaimStatus, string> = {
  verified: "text-trust-high",
  weak: "text-trust-medium",
  unsupported: "text-trust-low",
};

export function ClaimVerificationPanel() {
  const claims = useWorkspaceStore((s) => s.claims);
  const status = useWorkspaceStore((s) => s.status);

  if (status !== "ready" || claims.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Claim verification</h2>
      <ul className="flex flex-col gap-2">
        {claims.map((claim) => (
          <li key={claim.id} className="rounded border border-neutral-200 p-2 text-xs">
            <div className="flex items-start gap-2">
              <span className={`font-semibold ${STATUS_CLASS[claim.status]}`}>
                {STATUS_ICON[claim.status]}
              </span>
              <div>
                <p>{claim.text}</p>
                {claim.verification_notes && (
                  <p className="mt-1 text-neutral-500">{claim.verification_notes}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
