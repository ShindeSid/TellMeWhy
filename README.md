# TellMeWhy

An **AI Reasoning Workspace** - not a chatbot. Every screen exists to answer one of:
*Why should I trust this? What evidence supports it? What assumptions exist? How confident is the
system? What changed that confidence? Should I verify this myself?*

Built across 8 milestones: architecture → backend → KAN routing → frontend → visualization →
verification → the Reasoning Sandbox → polish. See [docs/architecture.md](docs/architecture.md)
for the full design and [docs/DEMO.md](docs/DEMO.md) for how to demo it.

## Quickstart

**Backend**
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate       # or source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env         # then fill in GEMINI_API_KEY, or set DEMO_MODE=true
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000. The backend must be running on :8000 (CORS is pre-configured for that origin).


## Architecture at a glance

```
User → Frontend (React/Vite) → FastAPI → KAN Cognitive Router → Adaptive Routing
  (small LLM / large LLM / RAG) → Meta Verification Layer → Trust Graph (SQLite)
  → read back out as Reasoning Timeline / Confidence Chart / Claim Panel / Trust Dashboard
```

Every subsystem writes structured metadata into the Trust Graph; nothing renders an explanation
it didn't actually compute. See the module responsibility table in
[docs/architecture.md](docs/architecture.md#core-modules).


## Project structure

```
backend/app/
  kan/            KAN Cognitive Router - swappable heuristic behind a fixed pydantic contract
  routing/        Adaptive Routing Engine (small/large LLM, RAG) + Gemini/Demo LLM clients
  verification/   Meta Verification Layer - claim splitting + heuristic verification
  trust_graph/    The only code path allowed to touch the DB
  explanation/    Writes the reasoning trace (steps, confidence, trust score) after generation
  demo/           Demo Mode preset scenarios
  api/routes/     FastAPI endpoints
  db/             SQLite schema + ChromaDB client

frontend/src/
  components/     QueryComposer, RoutingSummary, ReasoningTimeline, ConfidenceEvolutionChart,
                  ClaimVerificationPanel, SourcesPanel, TrustDashboard, DemoModeBar
  store/          zustand workspace state machine
  lib/api.ts      typed fetch client
```
