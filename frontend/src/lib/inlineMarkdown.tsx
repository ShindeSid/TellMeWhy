import type { ReactNode } from "react";

// The model is asked to keep markdown light (see backend _STYLE_INSTRUCTION),
// but still emits **bold**, *italic*, and occasionally a stray # header or
// --- rule. This renders that inline, character-offset-preserving so claim
// highlighting (which slices the raw text by span_start/span_end) still
// lines up - it only transforms already-sliced strings for display, it
// never changes string length before slicing happens upstream.
const INLINE_TOKEN = /\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_/g;

// Safety net: the model is told not to use LaTeX but occasionally slips in a
// $$...$$ block anyway. Unwrap it to plain text rather than showing raw
// dollar signs and backslash commands. Applied before line-splitting, so it
// only affects display - it runs after claim-highlight offsets already sliced
// the raw text, not before.
function stripLatexArtifacts(text: string): string {
  return text
    .replace(/\$\$(.+?)\$\$/g, "$1")
    .replace(/\$(.+?)\$/g, "$1")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\rightarrow/g, "→")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\left|\\right/g, "")
    .replace(/\\([a-zA-Z]+)/g, "$1");
}

function renderInlineTokens(content: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let tokenIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_TOKEN.lastIndex = 0;
  while ((match = INLINE_TOKEN.exec(content))) {
    if (match.index > last) nodes.push(content.slice(last, match.index));
    const bold = match[1] ?? match[2];
    const italic = match[3] ?? match[4];
    if (bold !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b-${tokenIndex++}`}>{bold}</strong>);
    } else if (italic !== undefined) {
      nodes.push(<em key={`${keyPrefix}-i-${tokenIndex++}`}>{italic}</em>);
    }
    last = INLINE_TOKEN.lastIndex;
  }
  if (last < content.length) nodes.push(content.slice(last));
  return nodes;
}

export function renderMarkdownInline(text: string, keyPrefix = "md"): ReactNode[] {
  const lines = stripLatexArtifacts(text).split("\n");
  const nodes: ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) nodes.push("\n");

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
      nodes.push(<hr key={`${keyPrefix}-hr-${lineIndex}`} className="my-1.5 border-t border-current/10" />);
      return;
    }

    const headerMatch = line.match(/^#{1,6}\s+(.*)$/);
    if (headerMatch) {
      nodes.push(
        <strong key={`${keyPrefix}-h-${lineIndex}`} className="mt-1 block font-semibold">
          {renderInlineTokens(headerMatch[1], `${keyPrefix}-h${lineIndex}`)}
        </strong>
      );
      return;
    }

    const bulletMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (bulletMatch) {
      nodes.push(bulletMatch[1], "• ", ...renderInlineTokens(bulletMatch[2], `${keyPrefix}-u${lineIndex}`));
      return;
    }

    nodes.push(...renderInlineTokens(line, `${keyPrefix}-l${lineIndex}`));
  });

  return nodes;
}
