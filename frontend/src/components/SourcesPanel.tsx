import { formatPercent } from "@/lib/format";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function SourcesPanel() {
  const status = useWorkspaceStore((s) => s.status);
  const sources = useWorkspaceStore((s) => s.sources);
  const generationCount = useWorkspaceStore((s) => s.generationCount);
  const isRegenerating = useWorkspaceStore((s) => s.isRegenerating);
  const toggleSource = useWorkspaceStore((s) => s.toggleSource);
  const regenerate = useWorkspaceStore((s) => s.regenerate);

  if (status !== "ready" || sources.length === 0) return null;

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
      <ul className="flex flex-col gap-2">
        {sources.map((source) => (
          <li
            key={source.id}
            className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm transition-opacity ${
              source.enabled ? "border-neutral-200" : "border-neutral-100 opacity-50"
            }`}
          >
            <input
              type="checkbox"
              checked={source.enabled}
              disabled={isRegenerating}
              onChange={(e) => void toggleSource(source.id, e.target.checked)}
              className="mt-0.5 accent-neutral-900"
              aria-label={`Use ${source.title ?? "this source"} when generating the answer`}
            />
            <div>
              <p className="font-medium">{source.title ?? "Untitled source"}</p>
              {source.similarity !== null && (
                <p className="text-xs text-neutral-500">{formatPercent(source.similarity)} relevant to your question</p>
              )}
            </div>
          </li>
        ))}
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
