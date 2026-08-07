import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import { formatPercent } from "@/lib/format";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const STAGE_LABEL: Record<string, string> = {
  intent: "Intent",
  planning: "Planning",
  retrieval: "Retrieval",
  reasoning: "Reasoning",
  verification: "Verification",
  answer: "Answer",
};

const STAGE_ICON: Record<string, string> = {
  intent: "🧭",
  planning: "🧠",
  retrieval: "🔎",
  reasoning: "✍️",
  verification: "🔍",
  answer: "✅",
};

function nodeColor(confidence: number | null): string {
  if (confidence === null) return "bg-neutral-200 border-neutral-300";
  if (confidence >= 0.7) return "bg-trust-high/15 border-trust-high text-trust-high";
  if (confidence >= 0.4) return "bg-trust-medium/15 border-trust-medium text-trust-medium";
  return "bg-trust-low/15 border-trust-low text-trust-low";
}

export function GraphOfThought() {
  const steps = useWorkspaceStore((s) => s.reasoningSteps);
  const status = useWorkspaceStore((s) => s.status);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  if ((status !== "ready" && status !== "generating") || steps.length === 0) return null;

  const selected = steps.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold">Graph of Thought</h2>
        <p className="text-xs text-neutral-500">
          Click a stage to inspect it. This shows *that* reasoning happened at each stage and how
          confident it was - not the model's internal chain-of-thought.
        </p>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1" role="list" aria-label="Reasoning stages">
        {steps.map((step, i) => (
          <motion.div
            key={step.id}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduceMotion ? { duration: 0 } : { delay: i * 0.08, type: "spring", stiffness: 300, damping: 20 }}
            className="flex items-center gap-1"
            role="listitem"
          >
            {i > 0 && <div className="h-0.5 w-4 shrink-0 bg-neutral-300" aria-hidden="true" />}
            <button
              type="button"
              onClick={() => setSelectedId(selectedId === step.id ? null : step.id)}
              aria-expanded={selectedId === step.id}
              aria-label={`${STAGE_LABEL[step.stage] ?? step.stage} stage, ${
                step.confidence !== null ? formatPercent(step.confidence) + " confident" : "in progress"
              }. Click to inspect.`}
              className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl border-2 px-3 py-2 text-center transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 ${nodeColor(step.confidence)} ${
                selectedId === step.id ? "ring-2 ring-neutral-900" : ""
              }`}
            >
              <span className="text-lg" aria-hidden="true">
                {STAGE_ICON[step.stage] ?? "•"}
              </span>
              <span className="text-xs font-semibold">{STAGE_LABEL[step.stage] ?? step.stage}</span>
              <span className="text-[10px]">{step.confidence !== null ? formatPercent(step.confidence) : "..."}</span>
            </button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
            className="overflow-hidden rounded-lg bg-neutral-50 p-3 text-sm"
          >
            <p className="font-medium">
              {STAGE_ICON[selected.stage]} {STAGE_LABEL[selected.stage] ?? selected.stage}
            </p>
            <p className="mt-1 text-neutral-600">{selected.summary}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
