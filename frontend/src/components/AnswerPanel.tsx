import type { ReactNode } from "react";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { STATUS_BG_CLASS, STATUS_ICON, STATUS_LABEL, STATUS_UNDERLINE_CLASS } from "@/lib/claimStatus";
import type { Claim } from "@/types/api";

function HighlightedAnswer({ text, claims }: { text: string; claims: Claim[] }) {
  const spans = claims
    .filter((c) => c.span_start !== null && c.span_end !== null)
    .sort((a, b) => (a.span_start ?? 0) - (b.span_start ?? 0));

  if (spans.length === 0) {
    return <p className="whitespace-pre-wrap text-base leading-relaxed">{text}</p>;
  }

  const pieces: ReactNode[] = [];
  let cursor = 0;
  spans.forEach((claim, i) => {
    const start = claim.span_start ?? 0;
    const end = claim.span_end ?? 0;
    if (start > cursor) pieces.push(<span key={`gap-${i}`}>{text.slice(cursor, start)}</span>);
    pieces.push(
      <mark
        key={claim.id}
        title={`${STATUS_LABEL[claim.status]}${claim.verification_notes ? " - " + claim.verification_notes : ""}`}
        className={`rounded px-0.5 underline decoration-2 underline-offset-2 ${STATUS_BG_CLASS[claim.status]} ${STATUS_UNDERLINE_CLASS[claim.status]}`}
      >
        {text.slice(start, end)}
      </mark>
    );
    cursor = Math.max(cursor, end);
  });
  if (cursor < text.length) pieces.push(<span key="tail">{text.slice(cursor)}</span>);

  return <p className="whitespace-pre-wrap text-base leading-relaxed">{pieces}</p>;
}

function HighlightLegend({ claims }: { claims: Claim[] }) {
  const present = Array.from(new Set(claims.map((c) => c.status)));
  if (present.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
      {present.map((status) => (
        <span key={status} className="flex items-center gap-1">
          <span className={`inline-block h-2.5 w-2.5 rounded-sm ${STATUS_BG_CLASS[status]}`} />
          {STATUS_ICON[status]} {STATUS_LABEL[status]}
        </span>
      ))}
      <span className="text-neutral-400">Hover a highlight for details</span>
    </div>
  );
}

export function AnswerPanel() {
  const status = useWorkspaceStore((s) => s.status);
  const answer = useWorkspaceStore((s) => s.answer);
  const claims = useWorkspaceStore((s) => s.claims);
  const errorMessage = useWorkspaceStore((s) => s.errorMessage);

  if (status === "idle") {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
        Ask a question above, or try one of the demo scenarios, to get started.
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="font-medium">Something went wrong</p>
        <p className="mt-1">{errorMessage}</p>
      </div>
    );
  }

  if (status === "generating" || status === "routing") {
    const label = status === "routing" ? "Reading your question..." : "Writing an answer...";
    return (
      <div className="rounded-xl border border-neutral-200 p-4" aria-hidden="true">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-400" />
          {label}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <div className="h-3 w-full animate-pulse rounded bg-neutral-200" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-neutral-200" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
    );
  }

  if (status === "ready" && answer) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <HighlightedAnswer text={answer.text} claims={claims} />
        <HighlightLegend claims={claims} />
      </div>
    );
  }

  return null;
}
