import { motion, useReducedMotion } from "framer-motion";

import { IconSparkles } from "@/components/icons";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/**
 * V2 pivot: this is the primary artifact, not the raw answer text below it.
 * The design thesis is "the human decision is the product" - so Level 1
 * shows what to do and how sure that is in plain language, not a bare
 * answer paired with a separate trust score the user has to combine
 * themselves. See docs/PITCH.md for the full reasoning.
 */
export function DecisionCard() {
  const status = useWorkspaceStore((s) => s.status);
  const decision = useWorkspaceStore((s) => s.decision);
  const reduceMotion = useReducedMotion();

  if (status !== "ready" && status !== "generating") return null;

  if (!decision) {
    if (status !== "generating") return null;
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/70 via-white to-sky-50/60 p-5"
        aria-hidden="true"
      >
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-brand-400 to-indigo-500" />
        <div className="flex flex-col gap-2 pl-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-brand-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-brand-100" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50 via-white to-sky-50 p-5 shadow-glow"
      role="region"
      aria-label="Recommendation"
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-brand-500 to-indigo-600" aria-hidden="true" />
      <div className="pl-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          <IconSparkles className="h-3.5 w-3.5" />
          What this suggests
        </p>
        <p className="mt-1 text-lg font-semibold leading-snug text-neutral-900 dark:text-neutral-100">{decision.recommendation}</p>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          <span aria-hidden="true">●</span> {decision.confidence_phrase}
        </p>
        <p className="mt-2 flex items-start gap-1.5 text-sm text-amber-700">
          <span aria-hidden="true">⚠</span>
          <span>{decision.key_caveat}</span>
        </p>
      </div>
    </motion.div>
  );
}
