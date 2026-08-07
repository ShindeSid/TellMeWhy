import type { SourceRecord } from "@/types/api";

export interface Contradiction {
  keyword: string;
  sourceA: string;
  sentenceA: string;
  sourceB: string;
  sentenceB: string;
}

const STOPWORDS = new Set([
  "about", "after", "again", "these", "those", "their", "there", "which",
  "would", "could", "should", "where", "while", "being", "other", "types",
  "typical", "normal", "certain", "healthy", "adults", "patients",
]);

const NUMBER_RE = /\d+(?:\.\d+)?\s*(mg|kg|g|%|percent|years?|days?|hours?|km|miles?|dollars?|usd|\$)/gi;

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function keywords(sentence: string): Set<string> {
  return new Set(
    sentence
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !STOPWORDS.has(w))
  );
}

function numberFacts(sentence: string): string[] {
  return [...sentence.matchAll(NUMBER_RE)].map((m) => m[0].replace(/\s+/g, "").toLowerCase());
}

/**
 * Heuristic, not semantic: flags two enabled sources' sentences as a
 * possible contradiction when they share a topic keyword but state
 * different numeric facts. Same honesty constraint as claim verification -
 * this can false-positive/negative and doesn't understand meaning.
 */
export function findContradictions(sources: SourceRecord[]): Contradiction[] {
  const enabled = sources.filter((s) => s.enabled && s.content);
  const found: Contradiction[] = [];

  for (let i = 0; i < enabled.length; i++) {
    for (let j = i + 1; j < enabled.length; j++) {
      const a = enabled[i];
      const b = enabled[j];
      for (const sentA of sentences(a.content ?? "")) {
        const factsA = numberFacts(sentA);
        if (factsA.length === 0) continue;
        const kwA = keywords(sentA);
        if (kwA.size === 0) continue;

        for (const sentB of sentences(b.content ?? "")) {
          const factsB = numberFacts(sentB);
          if (factsB.length === 0) continue;
          const kwB = keywords(sentB);

          const shared = [...kwA].filter((w) => kwB.has(w));
          if (shared.length === 0) continue;

          const differs = factsA.some((fa) => !factsB.includes(fa)) || factsB.some((fb) => !factsA.includes(fb));
          if (!differs) continue;

          found.push({
            keyword: shared[0],
            sourceA: a.title ?? "Source A",
            sentenceA: sentA,
            sourceB: b.title ?? "Source B",
            sentenceB: sentB,
          });
        }
      }
    }
  }

  return found.slice(0, 5);
}
