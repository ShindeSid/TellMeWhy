# TellMeWhy

An **AI Reasoning Workspace** — not a chatbot. 

### The Problem
Current AI systems operate as black boxes (Question → Loading Spinner → Answer). Users cannot understand *why* an answer was produced, what evidence was used, how confidence evolved, or whether they should trust the output. This creates automation bias and poor decision-making.

### The Solution
TellMeWhy is an interface that allows users to observe, inspect, and interact with AI reasoning WITHOUT exposing raw neural activations or raw chain-of-thought dumps. Every screen exists to answer one of:
* *Why should I trust this?*
* *What evidence supports it?*
* *What assumptions exist?*
* *How confident is the system?*
* *What changed that confidence?*
* *Should I verify this myself?*

### Key Features
- **KAN Cognitive Router:** Intelligently predicts query complexity, ambiguity, and trust to route requests optimally.
- **Adaptive Routing:** Routes simple queries to small LLMs, complex ones to large LLMs, and factual ones to RAG to reduce latency and cost.
- **Meta Verification Layer:** Splits responses into atomic claims, verifies them, attributes sources, and detects contradictions.
- **Interactive Graph of Thought:** Visualizes the entire pipeline (Intent → Planning → Retrieval → Reasoning → Verification → Answer).
- **Confidence Evolution Timeline:** Shows how the AI's confidence changed throughout its reasoning process and why.
- **Reasoning Sandbox:** Allows users to alter the reasoning post-generation by removing sources or uploading new ones to see how the answer changes.

Built across 8 milestones: architecture → backend → KAN routing → frontend → visualization → verification → the Reasoning Sandbox → polish. See [docs/architecture.md](docs/architecture.md) for the full design.

---

## 🚀 Quickstart (Local Development)

### Backend
```bash
cd backend
python -m venv .venv
# Activate virtual environment:
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env         # then fill in GEMINI_API_KEY
uvicorn app.main:app --reload
```

*On Windows, you can use the provided script to do all of the above in one step:*
```powershell
.\backend\start.ps1
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The backend must be running on port `:8000` (CORS is pre-configured for that origin).

---

## 🌍 Deployment

### Backend (Render)
The backend is configured for deployment on [Render](https://render.com) using the included `render.yaml` blueprint.

1. Create a new Web Service on Render and connect this repository.
2. The `render.yaml` will automatically configure the build and start commands (`pip install -r requirements.txt` and `uvicorn app.main:app --host 0.0.0.0 --port $PORT`).
3. Add your `GEMINI_API_KEY` to the environment variables in the Render dashboard.
4. Update `CORS_ORIGINS` in Render's environment variables to include your frontend's deployment URL (e.g., `https://your-frontend-project.vercel.app`).

### Frontend (Vercel / Netlify)
The React/Vite frontend can be deployed easily on platforms like [Vercel](https://vercel.com) or [Netlify](https://netlify.com).

1. Import the `frontend` directory as a new project on your preferred platform.
2. Set the Build Command to `npm run build` and the Output Directory to `dist`.
3. Add the deployed backend URL to your frontend's environment variables (e.g., `VITE_API_URL` depending on your setup).

---

## 🧠 Architecture at a glance

```text
User → Frontend (React/Vite) → FastAPI → KAN Cognitive Router → Adaptive Routing
  (small LLM / large LLM / RAG) → Meta Verification Layer → Trust Graph (SQLite)
  → read back out as Reasoning Timeline / Confidence Chart / Claim Panel / Trust Dashboard
```

Every subsystem writes structured metadata into the Trust Graph; nothing renders an explanation it didn't actually compute. See the module responsibility table in [docs/architecture.md](docs/architecture.md#core-modules).

---

## 📂 Project structure

```text
backend/app/
  kan/            KAN Cognitive Router - swappable heuristic behind a fixed pydantic contract
  routing/        Adaptive Routing Engine (small/large LLM, RAG) + Gemini client
  understanding/  Query understanding, decision synthesis, simplify/counterfactual explanations
  verification/   Meta Verification Layer - claim splitting + heuristic verification
  trust_graph/    The only code path allowed to touch the DB
  explanation/    Writes the reasoning trace (steps, confidence, trust score) after generation
  streaming/      SSE event bus + pipeline driving the live workspace UI
  api/routes/     FastAPI endpoints
  db/             SQLite schema + ChromaDB client

frontend/src/
  App.tsx         Chat-style workspace layout (message log + docked composer) and theming
  components/     QueryComposer, RoutingSummary, GraphOfThought, ConfidenceEvolutionChart,
                  ClaimVerificationPanel, SourcesPanel, TrustDashboard, DecisionCard
  store/          zustand workspace state machine (incl. multi-turn chat history)
  lib/api.ts      typed fetch client
```
## Work Done
This project was developed during the "Hackathon For Human-Centred Design of Large Language Model Interfaces on 7th - 8th August 2026" at IIIT Pune ACM SIGCHI in collaboration with IIT Bombay ACM SIGCHI (Student Chapters)