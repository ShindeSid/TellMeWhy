import { motion, useReducedMotion } from "framer-motion";

import { formatPercent } from "@/lib/format";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const STAGE_LABEL: Record<string, string> = {
  intent: "Understood the question",
  planning: "Chose how to answer",
  retrieval: "Looked things up",
  reasoning: "Wrote the answer",
  verification: "Checked the answer",
  answer: "Finished",
};

const STAGE_ICON: Record<string, string> = {
  intent: "🧭",
  planning: "🧠",
  retrieval: "🔎",
  reasoning: "✍️",
  verification: "🔍",
  answer: "✅",
};

export function ReasoningTimeline() {
  const steps = useWorkspaceStore((s) => s.reasoningSteps);
  const status = useWorkspaceStore((s) => s.status);
  const reduceMotion = useReducedMotion();

  if (status !== "ready" || steps.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold">How it got here</h2>
      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <motion.li
            key={step.id}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { delay: i * 0.06 }}
            className="rounded-lg border border-neutral-100 bg-neutral-50 p-2.5 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <span aria-hidden="true">{STAGE_ICON[step.stage] ?? "•"}</span>
                {STAGE_LABEL[step.stage] ?? step.stage}
              </span>
              {step.confidence !== null && (
                <span className="text-xs text-neutral-500">{formatPercent(step.confidence)} confident</span>
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-500">{step.summary}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
