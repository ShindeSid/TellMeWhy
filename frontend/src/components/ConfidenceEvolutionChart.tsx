import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function ConfidenceEvolutionChart() {
  const steps = useWorkspaceStore((s) => s.reasoningSteps);
  const status = useWorkspaceStore((s) => s.status);

  if (status !== "ready" || steps.length === 0) return null;

  const data = steps
    .filter((s) => s.confidence !== null)
    .map((s) => ({ stage: s.stage, confidence: Math.round((s.confidence ?? 0) * 100) }));

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Confidence evolution</h2>
      <div className="h-40 rounded border border-neutral-200 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Line type="monotone" dataKey="confidence" stroke="#171717" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
