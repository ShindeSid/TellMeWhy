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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Sources</h2>
        {generationCount > 1 && (
          <span className="text-xs text-neutral-400">version {generationCount}</span>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {sources.map((source) => (
          <li key={source.id} className="flex items-start gap-2 rounded border border-neutral-200 p-2 text-xs">
            <input
              type="checkbox"
              checked={source.enabled}
              disabled={isRegenerating}
              onChange={(e) => void toggleSource(source.id, e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <p className="font-medium">{source.title ?? "Untitled source"}</p>
              {source.similarity !== null && (
                <p className="text-neutral-500">similarity {Math.round(source.similarity * 100)}%</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => void regenerate()}
        disabled={isRegenerating}
        className="self-start rounded bg-neutral-900 px-3 py-1.5 text-xs text-white disabled:opacity-40"
      >
        {isRegenerating ? "Regenerating..." : "Regenerate with selected sources"}
      </button>
    </div>
  );
}
