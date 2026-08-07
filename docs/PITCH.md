# Pitch Strategy

## The one-line pitch
Most AI products hide their reasoning behind a loading spinner. TellMeWhy makes the reasoning
itself the product — and it catches its own model's mistakes in front of you.

## Opening line for judges
"We're not going to show you a chatbot. We're going to show you an AI system that flags its own
hallucination, live, in front of you." → run the Medical demo scenario, point at the ✗ unsupported
claim. That's the whole pitch in one screenshot.

## Mapping to judging criteria

**Explainable AI / Transparency** — every number on screen traces back to a real computation you
can point at in the code: the Routing Summary explains *why* a route was picked (not just which),
the Reasoning Timeline shows *when* confidence changed and *why* (`confidence_events` table), and
the Claim Verification panel shows *what specifically* wasn't supported, not just an aggregate
score.

**Trust Calibration** — the Trust Dashboard deliberately does not just print "87% confident."
It prints a plain-English sentence explaining what that number is actually based on (a
pre-generation estimate? real claim verification against sources? no sources at all?) — because a
bare percentage is exactly what causes automation bias, and that's the problem statement.

**HCI / UX** — the reasoning sandbox is the flagship interaction: disable a source, watch the
answer and trust score change in response. That's the difference between an AI *explanation*
(passive) and an AI *workspace* (something you operate).

**Technical Architecture** — the KAN router is a swappable interface (`CognitiveRouter` Protocol)
with a documented, fixed I/O contract, not glued directly into the API. Every subsystem
(routing, verification, explanation) writes into one SQLite "Trust Graph" and nothing downstream
invents data — the Explanation Engine strictly reads, never fabricates. `generation_number`
threading means regenerating an answer never corrupts or interleaves the previous run's trace.

**Practicality / Innovation** — Demo Mode isn't a cosmetic feature bolted on for the pitch: it's
the same architecture point made concrete. The LLM client and retrieval are both swappable behind
thin interfaces (`GeminiClient` / `DemoLLMClient`, live ChromaDB / canned chunks), so the entire
pipeline — KAN routing, verification, trust scoring, the sandbox — runs identically in both modes.
That's not a demo trick, that's the architecture working as designed under a real-world constraint
(no working API key at build time).

## Honest framing for the "what's not done" question
If asked what's stubbed: claim verification is heuristic lexical-overlap, not semantic
entailment — we say so in the UI copy itself (verification notes literally state the method).
Contradiction Explorer (F29) wasn't built — there was nothing structurally interesting to show
without multiple genuinely conflicting sources. We'd rather say "not built" than fake it.

## Live-demo risk mitigation
Demo Mode exists specifically so venue wifi / API quota / a revoked key can't kill the demo.
Always have `DEMO_MODE=true` as the fallback path rehearsed, even if you plan to show a live key.
