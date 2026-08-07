import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import { formatPercent } from "@/lib/format";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function SourcesPanel() {
  const status = useWorkspaceStore((s) => s.status);
  const sources = useWorkspaceStore((s) => s.sources);
  const generationCount = useWorkspaceStore((s) => s.generationCount);
  const isRegenerating = useWorkspaceStore((s) => s.isRegenerating);
  const toggleSource = useWorkspaceStore((s) => s.toggleSource);
  const regenerate = useWorkspaceStore((s) => s.regenerate);
  const understanding = useWorkspaceStore((s) => s.understanding);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  if ((status !== "ready" && status !== "generating") || sources.length === 0) return null;

  const hasAlternatives = (understanding?.alternative_interpretations.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Where this came from</h2>
          <p className="text-xs text-neutral-500">
            Uncheck a source and regenerate to see how the answer changes without it.
          </p>
        </div>
        {generationCount > 1 && (
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-500">
            version {generationCount}
          </span>
        )}
      </div>

      {hasAlternatives && (
        <p className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-800">
          <span className="font-medium">Note:</span> this question could be read more than one way -
          see "I believe you are asking" above for other viewpoints before trusting a single answer.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {sources.map((source, i) => {
          const isExpanded = expandedId === source.id;
          return (
            <motion.li
              key={source.id}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: i * 0.06 }}
              className={`rounded-lg border p-2.5 text-sm transition-opacity ${
                source.enabled ? "border-neutral-200" : "border-neutral-100 opacity-50"
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={source.enabled}
                  disabled={isRegenerating}
                  onChange={(e) => void toggleSource(source.id, e.target.checked)}
                  className="mt-0.5 accent-neutral-900"
                  aria-label={`Use ${source.title ?? "this source"} when generating the answer`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-medium">{source.title ?? "Untitled source"}</p>
                    {source.url_or_path && (
                      <a
                        href={source.url_or_path}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-xs text-blue-600 hover:underline"
                      >
                        Open ↗
                      </a>
                    )}
                  </div>
                  {source.similarity !== null && (
                    <p className="text-xs text-neutral-500">{formatPercent(source.similarity)} relevant to your question</p>
                  )}
                  {source.content && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : source.id)}
                      className="mt-1 text-xs font-medium text-neutral-500 underline hover:text-neutral-700"
                    >
                      {isExpanded ? "Hide excerpt" : "Show excerpt"}
                    </button>
                  )}
                  {isExpanded && source.content && (
                    <p className="mt-1.5 rounded bg-neutral-50 p-2 text-xs leading-relaxed text-neutral-600">
                      {source.content}
                    </p>
                  )}
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => void regenerate()}
        disabled={isRegenerating}
        className="self-start rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isRegenerating ? "Regenerating..." : "Regenerate with selected sources"}
      </button>
    </div>
  );
}
