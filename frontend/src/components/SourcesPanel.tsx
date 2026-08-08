import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import { IconBadgeCheck, IconFile, IconGlobe, IconQuote, IconSearch } from "@/components/icons";
import { formatPercent } from "@/lib/format";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { SourceRecord } from "@/types/api";

// Researcher aid: the retrieval layer tags every external hit as
// "Title (Provider)" - surfacing that provider as a labeled badge (instead
// of leaving it buried in the title text) makes it fast to tell a
// peer-reviewed hit from an encyclopedia entry at a glance.
const PROVIDER_META: Record<string, { label: string; icon: typeof IconGlobe }> = {
  Wikipedia: { label: "Encyclopedia", icon: IconGlobe },
  arXiv: { label: "Preprint", icon: IconFile },
  "PubMed (NIH/NCBI)": { label: "Peer-reviewed", icon: IconBadgeCheck },
  "Semantic Scholar": { label: "Academic search", icon: IconSearch },
  NASA: { label: "Government/space agency", icon: IconGlobe },
};

function detectProvider(title: string | null): { label: string; icon: typeof IconGlobe } | null {
  if (!title) return null;
  const match = title.match(/\(([^()]+(?:\([^()]*\))?)\)\s*$/);
  const provider = match?.[1];
  if (!provider) return null;
  return PROVIDER_META[provider] ?? { label: provider, icon: IconGlobe };
}

function buildCitation(source: SourceRecord): string {
  const title = source.title ?? "Untitled source";
  const year = new Date(source.created_at).getFullYear();
  return source.url_or_path
    ? `${title}. Retrieved ${year}, from ${source.url_or_path}`
    : `${title}. Accessed via uploaded knowledge base, ${year}.`;
}

function CiteButton({ source }: { source: SourceRecord }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(buildCitation(source)).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      title="Copy citation"
      aria-label={`Copy citation for ${source.title ?? "this source"}`}
      className="flex shrink-0 cursor-pointer items-center gap-1 rounded text-xs font-medium text-neutral-400 transition-colors hover:text-brand-600 dark:text-neutral-500 dark:hover:text-brand-400"
    >
      <IconQuote className="h-3.5 w-3.5" />
      {copied ? "Copied" : "Cite"}
    </button>
  );
}

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
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200/70 border-t-2 border-t-teal-400 bg-white p-4 shadow-card dark:border-neutral-700/70 dark:border-t-teal-500 dark:bg-neutral-800">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Where this came from</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Uncheck a source and regenerate to see how the answer changes without it.
          </p>
        </div>
        {generationCount > 1 && (
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400">
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
                    <div className="flex shrink-0 items-center gap-2">
                      <CiteButton source={source} />
                      {source.url_or_path && (
                        <a
                          href={source.url_or_path}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Open ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {(() => {
                      const provider = detectProvider(source.title);
                      if (!provider) return null;
                      const Icon = provider.icon;
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                          <Icon className="h-3 w-3" />
                          {provider.label}
                        </span>
                      );
                    })()}
                    {source.similarity !== null && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatPercent(source.similarity)} relevant to your question
                      </p>
                    )}
                  </div>
                  {source.content && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : source.id)}
                      className="mt-1 cursor-pointer text-xs font-medium text-neutral-500 dark:text-neutral-400 underline hover:text-neutral-700 dark:hover:text-neutral-300"
                    >
                      {isExpanded ? "Hide excerpt" : "Show excerpt"}
                    </button>
                  )}
                  {isExpanded && source.content && (
                    <p className="mt-1.5 rounded bg-neutral-50 p-2 text-xs leading-relaxed text-neutral-600 dark:bg-neutral-700/50 dark:text-neutral-300">
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
        className="self-start cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-indigo-700 px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isRegenerating ? "Regenerating..." : "Regenerate with selected sources"}
      </button>
    </div>
  );
}
