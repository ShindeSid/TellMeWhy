import { motion, useReducedMotion } from "framer-motion";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const STAGE_LABEL: Record<string, string> = {
  intent: "Intent",
  planning: "Planning",
  retrieval: "Retrieval",
  reasoning: "Reasoning",
  verification: "Verification",
  answer: "Answer",
};

export function ReasoningTimeline() {
  const steps = useWorkspaceStore((s) => s.reasoningSteps);
  const status = useWorkspaceStore((s) => s.status);
  const reduceMotion = useReducedMotion();

  if (status !== "ready" || steps.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Reasoning timeline</h2>
      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <motion.li
            key={step.id}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { delay: i * 0.06 }}
            className="rounded border border-neutral-200 p-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{STAGE_LABEL[step.stage] ?? step.stage}</span>
              {step.confidence !== null && (
                <span className="text-neutral-500">{Math.round(step.confidence * 100)}%</span>
              )}
            </div>
            <p className="mt-1 text-neutral-500">{step.summary}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
