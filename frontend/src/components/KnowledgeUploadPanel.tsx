import { useEffect, useRef, useState } from "react";

import { IconClose, IconFile, IconLink, IconNote } from "@/components/icons";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const SOURCE_TYPE_ICON: Record<string, (props: { className?: string }) => JSX.Element> = {
  file: IconFile,
  url: IconLink,
  text: IconNote,
};

export function KnowledgeUploadPanel({ defaultExpanded = false }: { defaultExpanded?: boolean }) {
  const [urlInput, setUrlInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [expanded, setExpanded] = useState(defaultExpanded);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const knowledgeItems = useWorkspaceStore((s) => s.knowledgeItems);
  const isUploading = useWorkspaceStore((s) => s.isUploading);
  const uploadError = useWorkspaceStore((s) => s.uploadError);
  const fetchKnowledge = useWorkspaceStore((s) => s.fetchKnowledge);
  const uploadFile = useWorkspaceStore((s) => s.uploadFile);
  const uploadUrl = useWorkspaceStore((s) => s.uploadUrl);
  const uploadText = useWorkspaceStore((s) => s.uploadText);
  const deleteKnowledgeItem = useWorkspaceStore((s) => s.deleteKnowledgeItem);

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
    <div id="knowledge-upload" className="flex flex-col gap-2 rounded-xl border border-neutral-200/70 bg-white p-3 shadow-sm dark:border-neutral-700/70 dark:bg-neutral-800">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex cursor-pointer items-center gap-1.5 text-left text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
      >
        <span aria-hidden="true" className="text-brand-500 font-bold">{expanded ? "−" : "+"}</span>
        <span>
          Resources
          {knowledgeItems.length > 0 && (
            <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-normal text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              {knowledgeItems.length}
            </span>
          )}
        </span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Add a PDF, a URL, or notes - anything here becomes part of what future answers can be
            grounded in.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
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
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
            />
            <button
              type="submit"
              disabled={isUploading || !urlInput.trim()}
              className="shrink-0 cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-indigo-700 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
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
              className="resize-none rounded-lg border border-neutral-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
            />
            <button
              type="submit"
              disabled={isUploading || !noteInput.trim()}
              className="self-start cursor-pointer rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              Add note
            </button>
          </form>

          {isUploading && <p className="text-xs text-neutral-400 dark:text-neutral-500">Processing...</p>}
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

          {knowledgeItems.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {knowledgeItems.map((item) => {
                const Icon = SOURCE_TYPE_ICON[item.source_type] ?? IconFile;
                return (
                  <li key={item.id} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs dark:bg-neutral-700/50">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <span className="shrink-0 text-neutral-400 dark:text-neutral-500">{item.chunk_count} chunk{item.chunk_count === 1 ? "" : "s"}</span>
                    <button
                      type="button"
                      onClick={() => void deleteKnowledgeItem(item.id)}
                      aria-label={`Remove ${item.title}`}
                      title="Remove this source"
                      className="shrink-0 cursor-pointer rounded text-neutral-400 dark:text-neutral-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <IconClose className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
