import { useEffect, useRef, useState } from "react";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const SOURCE_TYPE_ICON: Record<string, string> = { file: "📄", url: "🔗", text: "📝" };

export function KnowledgeUploadPanel() {
  const [urlInput, setUrlInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const knowledgeItems = useWorkspaceStore((s) => s.knowledgeItems);
  const isUploading = useWorkspaceStore((s) => s.isUploading);
  const uploadError = useWorkspaceStore((s) => s.uploadError);
  const fetchKnowledge = useWorkspaceStore((s) => s.fetchKnowledge);
  const uploadFile = useWorkspaceStore((s) => s.uploadFile);
  const uploadUrl = useWorkspaceStore((s) => s.uploadUrl);
  const uploadText = useWorkspaceStore((s) => s.uploadText);

  useEffect(() => {
    void fetchKnowledge();
  }, [fetchKnowledge]);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = "";
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    void uploadUrl(urlInput.trim());
    setUrlInput("");
  };

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    void uploadText(noteInput.trim());
    setNoteInput("");
  };

  return (
    <div id="knowledge-upload" className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between text-left text-sm font-semibold"
      >
        <span>
          Your knowledge sources
          {knowledgeItems.length > 0 && (
            <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal text-neutral-500">
              {knowledgeItems.length}
            </span>
          )}
        </span>
        <span aria-hidden="true">{expanded ? "-" : "+"}</span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-neutral-500">
            Add a PDF, a URL, or notes - anything here becomes part of what future answers can be
            grounded in.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-40"
            >
              Upload PDF or file
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePick} accept=".pdf,.txt,.md" />
          </div>

          <form onSubmit={handleUrlSubmit} className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              disabled={isUploading}
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isUploading || !urlInput.trim()}
              className="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              Add URL
            </button>
          </form>

          <form onSubmit={handleNoteSubmit} className="flex flex-col gap-1.5">
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Or paste a note directly..."
              rows={2}
              disabled={isUploading}
              className="resize-none rounded-lg border border-neutral-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isUploading || !noteInput.trim()}
              className="self-start rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-40"
            >
              Add note
            </button>
          </form>

          {isUploading && <p className="text-xs text-neutral-400">Processing...</p>}
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

          {knowledgeItems.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {knowledgeItems.map((item) => (
                <li key={item.id} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs">
                  <span aria-hidden="true">{SOURCE_TYPE_ICON[item.source_type] ?? "📄"}</span>
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <span className="shrink-0 text-neutral-400">{item.chunk_count} chunk{item.chunk_count === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
