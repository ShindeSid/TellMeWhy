import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function QueryUnderstandingPanel() {
  const status = useWorkspaceStore((s) => s.status);
  const understanding = useWorkspaceStore((s) => s.understanding);
  const dismissed = useWorkspaceStore((s) => s.understandingDismissed);
  const dismiss = useWorkspaceStore((s) => s.dismissUnderstanding);
  const setQueryText = useWorkspaceStore((s) => s.setQueryText);
  const activeQueryText = useWorkspaceStore((s) => s.activeQueryText);

  if (dismissed || !understanding) return null;
  if (status === "idle" || status === "error") return null;

  const hasMissingInfo = understanding.missing_information.length > 0;
  const hasAlternatives = understanding.alternative_interpretations.length > 0;

  const handleModify = () => {
    setQueryText(activeQueryText ?? "");
    document.getElementById("query-input")?.focus();
    dismiss();
  };

  const handleClarify = () => {
    const addition = understanding.missing_information
      .map((item) => `\n\n(Regarding ${item.toLowerCase()}: )`)
      .join("");
    setQueryText((activeQueryText ?? "") + addition);
    document.getElementById("query-input")?.focus();
    dismiss();
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm text-blue-900">
        <span className="font-semibold">I believe you are asking:</span> {understanding.intent_summary}
      </p>

      {understanding.entities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {understanding.entities.map((entity) => (
            <span key={entity} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
              {entity}
            </span>
          ))}
        </div>
      )}

      {hasAlternatives && (
        <div className="text-xs text-blue-800">
          <span className="font-medium">Could also mean:</span>{" "}
          {understanding.alternative_interpretations.join("; ")}
        </div>
      )}

      {hasMissingInfo && (
        <div className="text-xs text-blue-800">
          <span className="font-medium">Would help to know:</span>{" "}
          {understanding.missing_information.join("; ")}
        </div>
      )}

      <div className="mt-1 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="cursor-pointer rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          Yes, that's right
        </button>
        <button
          type="button"
          onClick={handleModify}
          className="cursor-pointer rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-900 transition-colors hover:bg-blue-100"
        >
          Let me rephrase
        </button>
        {hasMissingInfo && (
          <button
            type="button"
            onClick={handleClarify}
            className="cursor-pointer rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-900 transition-colors hover:bg-blue-100"
          >
            Add missing detail
          </button>
        )}
      </div>
    </div>
  );
}
