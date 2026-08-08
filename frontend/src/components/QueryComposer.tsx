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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-2xl border border-neutral-200/70 border-t-2 border-t-brand-400 bg-white p-4 shadow-card dark:border-neutral-700/70 dark:border-t-brand-500 dark:bg-neutral-800"
    >
      <label htmlFor="query-input" className="sr-only">
        Ask a question
      </label>
      <textarea
        id="query-input"
        value={queryText}
        onChange={(e) => setQueryText(e.target.value)}
        placeholder={'Ask anything - e.g. "Is it safe to take ibuprofen with paracetamol?"'}
        rows={3}
        disabled={isBusy}
        className="w-full resize-none rounded-lg border border-neutral-300 p-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
      />
      <div className="flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500">
        <span>{queryText.length} characters</span>
        <button
          type="submit"
          disabled={isBusy || !queryText.trim()}
          className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-indigo-700 px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isBusy ? "Working..." : "Ask"}
        </button>
      </div>
    </form>
  );
}
