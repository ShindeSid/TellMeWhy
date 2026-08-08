import { useState } from "react";
import type { ReactNode } from "react";

import { IconPause } from "@/components/icons";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { STATUS_BG_CLASS, STATUS_ICON, STATUS_LABEL, STATUS_UNDERLINE_CLASS } from "@/lib/claimStatus";
import { renderMarkdownInline } from "@/lib/inlineMarkdown";
import type { Claim } from "@/types/api";

const HITL_THRESHOLD = 0.5;

function ClaimPopover({ claim }: { claim: Claim }) {
  const simplified = useWorkspaceStore((s) => s.simplifiedClaims[claim.id]);
  const isSimplifying = useWorkspaceStore((s) => s.simplifyingClaimId === claim.id);
  const isImproving = useWorkspaceStore((s) => s.improvingClaimId === claim.id);
  const simplifyClaim = useWorkspaceStore((s) => s.simplifyClaim);
  const improveClaim = useWorkspaceStore((s) => s.improveClaim);
  const counterfactual = useWorkspaceStore((s) => s.counterfactuals[claim.id]);
  const isFetchingCounterfactual = useWorkspaceStore((s) => s.counterfactualClaimId === claim.id);
  const fetchCounterfactual = useWorkspaceStore((s) => s.fetchCounterfactual);

  return (
    <span
      role="dialog"
      aria-label="Claim details"
      className="absolute left-0 top-full z-10 mt-1 w-72 rounded-lg border border-neutral-200 bg-white p-3 text-left text-xs normal-case shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
    >
      <span className={`block font-semibold ${STATUS_ICON[claim.status] ? "" : ""}`}>
        {STATUS_ICON[claim.status]} {STATUS_LABEL[claim.status]}
      </span>
      {claim.verification_notes && <span className="mt-1 block text-neutral-500 dark:text-neutral-400">{claim.verification_notes}</span>}

      {simplified && (
        <span className="mt-2 block rounded bg-neutral-50 p-2 text-neutral-700 dark:bg-neutral-700/50 dark:text-neutral-300">{simplified}</span>
      )}

      {counterfactual && (
        <span className="mt-2 block rounded bg-blue-50 p-2 text-blue-800">
          <span className="font-medium">Would change if: </span>
          {counterfactual}
        </span>
      )}

      <span className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void simplifyClaim(claim.id);
          }}
          disabled={isSimplifying}
          className="cursor-pointer rounded border border-neutral-300 px-2 py-1 font-medium hover:bg-neutral-100 disabled:opacity-40"
        >
          {isSimplifying ? "Simplifying..." : "Simplify"}
        </button>
        {claim.status !== "verified" && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void fetchCounterfactual(claim.id);
              }}
              disabled={isFetchingCounterfactual}
              className="cursor-pointer rounded border border-neutral-300 px-2 py-1 font-medium hover:bg-neutral-100 disabled:opacity-40"
            >
              {isFetchingCounterfactual ? "Checking..." : "What would change this?"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void improveClaim(claim.id);
              }}
              disabled={isImproving}
              className="cursor-pointer rounded border border-neutral-300 px-2 py-1 font-medium hover:bg-neutral-100 disabled:opacity-40"
            >
              {isImproving ? "Improving..." : "Improve this part"}
            </button>
          </>
        )}
      </span>
    </span>
  );
}

function HighlightedAnswer({ text, claims }: { text: string; claims: Claim[] }) {
  const [openClaimId, setOpenClaimId] = useState<string | null>(null);

  // Only flag claims that actually need attention — verified claims render
  // as plain text so the answer doesn't look like a highlighted textbook.
  const spans = claims
    .filter(
      (c) => c.span_start !== null && c.span_end !== null && c.status !== "verified"
    )
    .sort((a, b) => (a.span_start ?? 0) - (b.span_start ?? 0));

  if (spans.length === 0) {
    return <p className="whitespace-pre-wrap text-base leading-relaxed">{renderMarkdownInline(text)}</p>;
  }

  const pieces: ReactNode[] = [];
  let cursor = 0;
  spans.forEach((claim, i) => {
    const start = claim.span_start ?? 0;
    const end = claim.span_end ?? 0;
    if (start > cursor) {
      pieces.push(<span key={`gap-${i}`}>{renderMarkdownInline(text.slice(cursor, start), `gap-${i}`)}</span>);
    }
    pieces.push(
      <span key={claim.id} className="relative inline">
        <mark
          role="button"
          tabIndex={0}
          aria-expanded={openClaimId === claim.id}
          aria-label={`${STATUS_LABEL[claim.status]}. Click for details.`}
          onClick={() => setOpenClaimId(openClaimId === claim.id ? null : claim.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpenClaimId(openClaimId === claim.id ? null : claim.id);
            }
          }}
          className={`cursor-pointer rounded px-0.5 underline decoration-2 underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 ${STATUS_BG_CLASS[claim.status]} ${STATUS_UNDERLINE_CLASS[claim.status]}`}
        >
          {renderMarkdownInline(text.slice(start, end), `mark-${claim.id}`)}
        </mark>
        {openClaimId === claim.id && <ClaimPopover claim={claim} />}
      </span>
    );
    cursor = Math.max(cursor, end);
  });
  if (cursor < text.length) {
    pieces.push(<span key="tail">{renderMarkdownInline(text.slice(cursor), "tail")}</span>);
  }

  return <p className="whitespace-pre-wrap text-base leading-relaxed">{pieces}</p>;
}

function HighlightLegend({ claims }: { claims: Claim[] }) {
  // Only show the legend for flagged claims (weak / unsupported) — there's no
  // value in a legend that just says "green = verified" when nothing is highlighted.
  const flagged = claims.filter((c) => c.status !== "verified");
  const present = Array.from(new Set(flagged.map((c) => c.status)));
  if (present.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3 text-xs text-neutral-500 dark:text-neutral-400">
      {present.map((status) => (
        <span key={status} className="flex items-center gap-1">
          <span className={`inline-block h-2.5 w-2.5 rounded-sm ${STATUS_BG_CLASS[status]}`} />
          {STATUS_ICON[status]} {STATUS_LABEL[status]}
        </span>
      ))}
      <span className="text-neutral-400 dark:text-neutral-500">Click a highlight for details</span>
    </div>
  );
}

function HumanInTheLoopGate() {
  const acknowledge = useWorkspaceStore((s) => s.acknowledgeHitl);
  const setQueryText = useWorkspaceStore((s) => s.setQueryText);
  const activeQueryText = useWorkspaceStore((s) => s.activeQueryText);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <div className="flex items-center gap-2">
        <IconPause className="h-5 w-5 shrink-0 text-amber-700" />
        <p className="text-sm font-semibold text-amber-900">
          This answer came back with low confidence - pausing before showing it.
        </p>
      </div>
      <p className="text-sm text-amber-800">
        Before you read it, consider: ask a more specific question, add a source that might help, or
        continue anyway and read it with appropriate skepticism.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setQueryText((activeQueryText ?? "") + " (please be more specific: )");
            document.getElementById("query-input")?.focus();
          }}
          className="cursor-pointer rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
        >
          Ask a clarifying question
        </button>
        <button
          type="button"
          onClick={() => document.getElementById("knowledge-upload")?.scrollIntoView({ behavior: "smooth" })}
          className="cursor-pointer rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
        >
          Add a source first
        </button>
        <button
          type="button"
          onClick={acknowledge}
          className="cursor-pointer rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          Continue anyway
        </button>
      </div>
    </div>
  );
}

export function AnswerPanel() {
  const status = useWorkspaceStore((s) => s.status);
  const answer = useWorkspaceStore((s) => s.answer);
  const claims = useWorkspaceStore((s) => s.claims);
  const trustScore = useWorkspaceStore((s) => s.trustScore);
  const hitlAcknowledged = useWorkspaceStore((s) => s.hitlAcknowledged);
  const errorMessage = useWorkspaceStore((s) => s.errorMessage);
  const liveStage = useWorkspaceStore((s) => s.liveStage);
  const streamingAnswerText = useWorkspaceStore((s) => s.streamingAnswerText);

  if (status === "idle") {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400 dark:text-neutral-500">
        Ask a question above to get started.
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
    const label = liveStage ?? (status === "routing" ? "Reading your question..." : "Writing an answer...");
    return (
      <div className="rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400" aria-live="polite">
          <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-400" aria-hidden="true" />
          {label}
        </div>
        {streamingAnswerText ? (
          <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed">
            {renderMarkdownInline(streamingAnswerText, "stream")}
            <span className="inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-neutral-400" aria-hidden="true" />
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2" aria-hidden="true">
            <div className="h-3 w-full animate-pulse rounded bg-neutral-200" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-neutral-200" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-200" />
          </div>
        )}
      </div>
    );
  }

  if (status === "ready" && answer) {
    const lowConfidence = (trustScore?.overall_trust ?? 1) < HITL_THRESHOLD;
    if (lowConfidence && !hitlAcknowledged) {
      return <HumanInTheLoopGate />;
    }

    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-card dark:border-neutral-700/70 dark:bg-neutral-800">
        <HighlightedAnswer text={answer.text} claims={claims} />
        <HighlightLegend claims={claims} />
      </div>
    );
  }

  return null;
}
