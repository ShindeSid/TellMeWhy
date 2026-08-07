import { useEffect, useRef, useState } from "react";

import { formatPercent } from "@/lib/format";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const STAGE_ORDER = ["intent", "planning", "retrieval", "reasoning", "verification"];
const STAGE_LABEL: Record<string, string> = {
  intent: "Intent Detection",
  planning: "KAN Router",
  retrieval: "Retrieval",
  reasoning: "Reasoning",
  verification: "Verification",
};

function StageChecklist({ completedStages, droppedAt }: { completedStages: string[]; droppedAt: string }) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {STAGE_ORDER.map((stage) => {
        const isDropped = stage === droppedAt;
        const isDone = completedStages.includes(stage) && !isDropped;
        if (!isDone && !isDropped) return null;
        return (
          <li key={stage} className={isDropped ? "font-medium text-amber-700" : "text-neutral-500"}>
            {isDropped ? "⚠" : "✓"} {STAGE_LABEL[stage] ?? stage}
            {isDropped && " - confidence dropped here"}
          </li>
        );
      })}
    </ul>
  );
}

export function ConfidenceDropModal() {
  const drop = useWorkspaceStore((s) => s.confidenceDrop);
  const isResuming = useWorkspaceStore((s) => s.isResuming);
  const isUploading = useWorkspaceStore((s) => s.isUploading);
  const uploadError = useWorkspaceStore((s) => s.uploadError);
  const resumeRun = useWorkspaceStore((s) => s.resumeRun);
  const uploadFile = useWorkspaceStore((s) => s.uploadFile);
  const uploadUrl = useWorkspaceStore((s) => s.uploadUrl);
  const uploadText = useWorkspaceStore((s) => s.uploadText);

  const [secondsLeft, setSecondsLeft] = useState(5);
  const [urlInput, setUrlInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [mode, setMode] = useState<"choose" | "url" | "note">("choose");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasActedRef = useRef(false);

  useEffect(() => {
    if (!drop) {
      setSecondsLeft(5);
      setMode("choose");
      hasActedRef.current = false;
      return;
    }
    setSecondsLeft(drop.timeoutSeconds);
  }, [drop]);

  useEffect(() => {
    if (!drop || hasActedRef.current) return;
    if (secondsLeft <= 0) {
      hasActedRef.current = true;
      void resumeRun(false);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [drop, secondsLeft, resumeRun]);

  if (!drop) return null;

  const act = (fn: () => void) => {
    if (hasActedRef.current) return;
    fn();
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    hasActedRef.current = true;
    void uploadFile(file).then(() => void resumeRun(true));
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    hasActedRef.current = true;
    void uploadUrl(urlInput.trim()).then(() => void resumeRun(true));
  };

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    hasActedRef.current = true;
    void uploadText(noteInput.trim()).then(() => void resumeRun(true));
  };

  const busy = isUploading || isResuming;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confidence dropped - collaborative recovery"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl bg-white p-5 shadow-xl">
        <div>
          <p className="text-sm font-semibold text-amber-800">Confidence decreased</p>
          <div className="mt-1 flex items-center gap-3 text-2xl font-bold">
            <span className="text-neutral-400">{formatPercent(drop.previous)}</span>
            <span aria-hidden="true" className="text-neutral-300">
              →
            </span>
            <span className="text-amber-600">{formatPercent(drop.current)}</span>
          </div>
        </div>

        <StageChecklist completedStages={drop.completedStages} droppedAt={drop.stage} />

        <p className="text-sm text-neutral-600">
          <span className="font-medium">Reason: </span>
          {drop.reason}
        </p>

        <p className="text-sm font-medium">Would you like to help improve this response?</p>

        {mode === "choose" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => fileInputRef.current?.click())}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-40"
            >
              Upload PDF
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePick} accept=".pdf,.txt,.md" />
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => setMode("url"))}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-40"
            >
              Add URL
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => setMode("note"))}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-40"
            >
              Paste Text
            </button>
          </div>
        )}

        {mode === "url" && (
          <form onSubmit={handleUrlSubmit} className="flex gap-2">
            <input
              type="url"
              autoFocus
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              disabled={busy}
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !urlInput.trim()}
              className="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Add
            </button>
          </form>
        )}

        {mode === "note" && (
          <form onSubmit={handleNoteSubmit} className="flex flex-col gap-1.5">
            <textarea
              autoFocus
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              rows={3}
              disabled={busy}
              placeholder="Paste supporting text..."
              className="resize-none rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !noteInput.trim()}
              className="self-start rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Add
            </button>
          </form>
        )}

        {busy && <p className="text-xs text-neutral-400">{isUploading ? "Processing your source..." : "Resuming..."}</p>}
        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

        <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => act(() => void resumeRun(false))}
            className="text-sm font-medium text-neutral-500 underline hover:text-neutral-700 disabled:opacity-40"
          >
            Continue without upload
          </button>
          <span className="text-xs text-neutral-400" aria-live="polite">
            {hasActedRef.current ? "" : `Continuing automatically in ${secondsLeft}...`}
          </span>
        </div>
      </div>
    </div>
  );
}
