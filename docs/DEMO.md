# Demo Guide

## Fastest path (no API key, no chromadb)

```bash
# backend/.env
DEMO_MODE=true
```

```bash
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev
```

Open the app — three buttons appear at the top: **Medical**, **Programming**, **Current Affairs**.
Click one. What you're seeing is real, not staged:

- **KAN routing is computed live** from the actual query text (domain detection, complexity,
  ambiguity, trust-slider effects) — only the LLM call and retrieval are canned.
- **Claim verification actually runs.** The Medical and Current Affairs canned answers each contain
  one fabricated detail not present in the canned sources — watch it get flagged `unsupported` (✗)
  in the Claim Verification panel, and watch the confidence score visibly drop at the verification
  stage in the Reasoning Timeline.
- **The Reasoning Sandbox actually works.** On the Medical or Current Affairs scenario, uncheck a
  source in the Sources panel and click "Regenerate with selected sources" — the answer changes to
  reflect only the remaining evidence, and a new "version 2" appears.
- **The Trust Dashboard's numbers are computed, not hardcoded** — try the same query at different
  Trust Slider positions (Fast vs. Reliable) before demo-running it and compare the routing decision.

## Suggested walkthrough for judges (~2 minutes)

1. Click **Medical**. Point out the Routing Summary explaining *why* RAG was chosen (domain +
   trust slider), and the Reasoning Timeline replacing a loading spinner.
2. Scroll to Claim Verification — show the ✗ unsupported claim next to the ✓ verified ones. This is
   the core XAI pitch: the system caught its own model's fabrication.
3. Uncheck the source that supports the ✗ claim's neighbor, hit Regenerate — the answer changes.
4. Open Trust Dashboard — read the plain-English summary aloud; note it explicitly says what the
   number does and doesn't mean (a deliberate anti-automation-bias design choice).

## With a real Gemini key

```bash
# backend/.env
GEMINI_API_KEY=your-key-here
DEMO_MODE=false
```

Any typed question now runs through live generation. `chromadb` is still required for the RAG
path specifically (medical/current-affairs-domain queries); without it those routes return a
clear `503` explaining why, rather than silently falling back to something else.
