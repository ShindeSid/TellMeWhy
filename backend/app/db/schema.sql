-- TellMeWhy Trust Graph schema (SQLite)
-- Vector embeddings live in ChromaDB, not here. This DB holds structured
-- metadata that every subsystem (KAN, routing, verification) writes into,
-- and that the Explanation Engine reads from exclusively.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS queries (
    id TEXT PRIMARY KEY,               -- uuid
    raw_text TEXT NOT NULL,
    intent_summary TEXT,               -- "I believe you are asking..."
    domain TEXT,
    entities TEXT,                     -- JSON array of strings (Query Understanding Panel)
    missing_information TEXT,          -- JSON array of strings
    alternative_interpretations TEXT,  -- JSON array of strings
    trust_slider_value REAL NOT NULL DEFAULT 0.5, -- 0 = fast, 1 = reliable
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS routing_decisions (
    id TEXT PRIMARY KEY,
    query_id TEXT NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
    complexity_score REAL NOT NULL,
    ambiguity_score REAL NOT NULL,
    hallucination_risk TEXT NOT NULL CHECK (hallucination_risk IN ('low','medium','high')),
    needs_retrieval INTEGER NOT NULL DEFAULT 0,
    needs_clarification INTEGER NOT NULL DEFAULT 0,
    expected_confidence REAL,
    token_budget INTEGER,
    carbon_estimate_g REAL,
    route TEXT NOT NULL CHECK (route IN ('small_llm','large_llm','rag')),
    rationale TEXT,                    -- why this route was chosen
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- generation_number distinguishes reasoning "runs" for the same query: the
-- Reasoning Sandbox (F36) regenerates an answer after the user tweaks
-- enabled sources, and each regeneration gets its own full trace so
-- "replay timeline" / "compare versions" can tell runs apart instead of
-- interleaving them.
CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    query_id TEXT NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
    generation_number INTEGER NOT NULL DEFAULT 1,
    text TEXT NOT NULL,
    route_used TEXT NOT NULL CHECK (route_used IN ('small_llm','large_llm','rag')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reasoning_steps (
    id TEXT PRIMARY KEY,
    query_id TEXT NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
    generation_number INTEGER NOT NULL DEFAULT 1,
    stage TEXT NOT NULL CHECK (stage IN ('intent','planning','retrieval','reasoning','verification','answer')),
    step_order INTEGER NOT NULL,
    summary TEXT NOT NULL,
    confidence REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS confidence_events (
    id TEXT PRIMARY KEY,
    query_id TEXT NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
    generation_number INTEGER NOT NULL DEFAULT 1,
    reasoning_step_id TEXT REFERENCES reasoning_steps(id) ON DELETE SET NULL,
    confidence_before REAL NOT NULL,
    confidence_after REAL NOT NULL,
    reason TEXT NOT NULL,               -- why confidence changed
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sources persist across regenerations of one query (they are not
-- per-generation) — F21 enable/disable toggles this same row set, and
-- `content` (the retrieved chunk text) is kept so a regeneration can build
-- a new prompt from only the enabled sources without re-querying ChromaDB.
CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    query_id TEXT NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
    title TEXT,
    url_or_path TEXT,
    content TEXT,                      -- retrieved chunk text, reused on regenerate
    similarity REAL,
    freshness_days INTEGER,
    reliability_score REAL,
    contribution_score REAL,           -- how much this source influenced the answer
    enabled INTEGER NOT NULL DEFAULT 1, -- user can disable to trigger partial regen
    rejected INTEGER NOT NULL DEFAULT 0,
    rejection_reason TEXT,              -- for "Why Not" panel
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    query_id TEXT NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
    generation_number INTEGER NOT NULL DEFAULT 1,
    text TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('verified','weak','unsupported')),
    verification_notes TEXT,
    span_start INTEGER,                 -- char offset in final answer, for highlight-linking
    span_end INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS claim_sources (
    claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    PRIMARY KEY (claim_id, source_id)
);

CREATE TABLE IF NOT EXISTS trust_scores (
    id TEXT PRIMARY KEY,
    query_id TEXT NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
    generation_number INTEGER NOT NULL DEFAULT 1,
    overall_trust REAL NOT NULL,
    verification_score REAL,
    freshness_score REAL,
    reasoning_depth_score REAL,
    plain_english_summary TEXT,         -- Trust Calibration Coach output
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_graph_nodes (
    id TEXT PRIMARY KEY,
    query_id TEXT NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    node_type TEXT
);

CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
    id TEXT PRIMARY KEY,
    query_id TEXT NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
    source_node_id TEXT NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
    target_node_id TEXT NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
    relation TEXT NOT NULL
);

-- Auth (Feature 8). Hackathon-scope, not production-hardened: bcrypt-hashed
-- passwords (never plaintext) and opaque random session tokens with an
-- expiry, but no rate limiting, email verification, or password reset flow.
-- Login is additive/optional - nothing elsewhere in this schema requires a
-- user_id, so guest usage is unaffected.
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
);

-- User-uploaded knowledge (Feature 3): files/URLs/text a user adds become
-- part of the shared ChromaDB "sources" collection so future RAG queries
-- can retrieve them. This table is just the human-readable manifest.
CREATE TABLE IF NOT EXISTS knowledge_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('file','url','text')),
    origin TEXT,                       -- filename or URL
    chunk_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_answers_query ON answers(query_id);
CREATE INDEX IF NOT EXISTS idx_routing_query ON routing_decisions(query_id);
CREATE INDEX IF NOT EXISTS idx_steps_query ON reasoning_steps(query_id);
CREATE INDEX IF NOT EXISTS idx_claims_query ON claims(query_id);
CREATE INDEX IF NOT EXISTS idx_sources_query ON sources(query_id);
CREATE INDEX IF NOT EXISTS idx_trust_query ON trust_scores(query_id);
