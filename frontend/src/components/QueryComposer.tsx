import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function QueryComposer() {
  const queryText = useWorkspaceStore((s) => s.queryText);
  const setQueryText = useWorkspaceStore((s) => s.setQueryText);
  const submitQuery = useWorkspaceStore((s) => s.submitQuery);
  const status = useWorkspaceStore((s) => s.status);

  const isBusy = status === "routing" || status === "generating";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitQuery();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="query-input" className="sr-only">
        Ask a question
      </label>
      <textarea
        id="query-input"
        value={queryText}
        onChange={(e) => setQueryText(e.target.value)}
        placeholder="Ask something..."
        rows={4}
        disabled={isBusy}
        className="w-full resize-none rounded border border-neutral-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-60"
      />
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{queryText.length} characters</span>
        <button
          type="submit"
          disabled={isBusy || !queryText.trim()}
          className="rounded bg-neutral-900 px-4 py-1.5 text-sm text-white disabled:opacity-40"
        >
          {isBusy ? "Working..." : "Ask"}
        </button>
      </div>
    </form>
  );
}
