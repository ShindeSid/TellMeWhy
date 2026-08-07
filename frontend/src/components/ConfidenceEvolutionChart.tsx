import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const STAGE_LABEL: Record<string, string> = {
  intent: "Understood",
  planning: "Planned",
  retrieval: "Looked up",
  reasoning: "Wrote",
  verification: "Checked",
  answer: "Finished",
};

export function ConfidenceEvolutionChart() {
  const steps = useWorkspaceStore((s) => s.reasoningSteps);
  const status = useWorkspaceStore((s) => s.status);

  if ((status !== "ready" && status !== "generating") || steps.length === 0) return null;

  const data = steps
    .filter((s) => s.confidence !== null)
    .map((s) => ({ stage: STAGE_LABEL[s.stage] ?? s.stage, confidence: Math.round((s.confidence ?? 0) * 100) }));

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold">Confidence over time</h2>
        <p className="text-xs text-neutral-500">How sure the system was at each step of forming this answer.</p>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(value: number) => [`${value}%`, "Confidence"]} />
            <Line type="monotone" dataKey="confidence" stroke="#171717" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
