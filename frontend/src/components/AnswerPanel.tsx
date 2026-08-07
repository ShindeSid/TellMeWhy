import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function AnswerPanel() {
  const status = useWorkspaceStore((s) => s.status);
  const answer = useWorkspaceStore((s) => s.answer);
  const errorMessage = useWorkspaceStore((s) => s.errorMessage);

  if (status === "idle") {
    return <p className="text-sm text-neutral-400">Ask a question to get started.</p>;
  }

  if (status === "error") {
    return (
      <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {errorMessage}
      </p>
    );
  }

  if (status === "generating" || status === "routing") {
    const label = status === "routing" ? "Analyzing your question..." : "Generating answer...";
    return (
      <div className="flex flex-col gap-2" aria-hidden="true">
        <p className="text-sm text-neutral-500">{label}</p>
        <div className="h-3 w-full animate-pulse rounded bg-neutral-200" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-neutral-200" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-200" />
      </div>
    );
  }

  if (status === "ready" && answer) {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer.text}</p>;
  }

  return null;
}
