import { useEffect, useState } from "react";

import { listDemoScenarios } from "@/lib/api";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { DemoScenarioSummary } from "@/types/api";

export function DemoModeBar() {
  const [scenarios, setScenarios] = useState<DemoScenarioSummary[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const status = useWorkspaceStore((s) => s.status);
  const runDemoScenario = useWorkspaceStore((s) => s.runDemoScenario);

  useEffect(() => {
    listDemoScenarios()
      .then((res) => setScenarios(res.scenarios))
      .catch(() => setUnavailable(true));
  }, []);

  // Backend not running DEMO_MODE=true, or scenarios list failed - say nothing
  // rather than showing broken buttons.
  if (unavailable || !scenarios) return null;

  const isBusy = status === "routing" || status === "generating";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold">Try a demo question</p>
      <p className="text-xs text-neutral-500">No setup needed - pick one to see the full experience.</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Demo scenarios">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            disabled={isBusy}
            onClick={() => void runDemoScenario(scenario.id)}
            className="rounded-lg border border-neutral-300 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 disabled:opacity-40"
          >
            {scenario.title}
          </button>
        ))}
      </div>
    </div>
  );
}
