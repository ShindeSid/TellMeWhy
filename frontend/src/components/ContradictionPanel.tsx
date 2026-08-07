import { useMemo } from "react";

import { findContradictions } from "@/lib/contradictions";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function ContradictionPanel() {
  const status = useWorkspaceStore((s) => s.status);
  const sources = useWorkspaceStore((s) => s.sources);

  const findings = useMemo(() => findContradictions(sources), [sources]);

  if ((status !== "ready" && status !== "generating") || sources.length < 2) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold">Do the sources agree?</h2>
        <p className="text-xs text-neutral-500">
          A quick automated scan for sources that state different numbers about the same topic
          - not a meaning-level check, just a heads-up worth reading closely.
        </p>
      </div>

      {findings.length === 0 ? (
        <p className="rounded-lg bg-trust-high/10 px-3 py-2 text-sm text-trust-high">
          No conflicting numbers found between the currently enabled sources.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {findings.map((f, i) => (
            <li key={i} className="rounded-lg border border-trust-medium/30 bg-trust-medium/5 p-2.5 text-sm">
              <p className="font-medium text-trust-medium">Possible disagreement about "{f.keyword}"</p>
              <p className="mt-1 text-neutral-700">
                <span className="font-medium">{f.sourceA}:</span> {f.sentenceA}
              </p>
              <p className="mt-1 text-neutral-700">
                <span className="font-medium">{f.sourceB}:</span> {f.sentenceB}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
