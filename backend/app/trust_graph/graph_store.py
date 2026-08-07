"""
Trust Graph read/write layer.

Every subsystem (KAN, routing, verification) writes structured metadata
through this module — nothing writes to the DB directly. The Explanation
Engine reads through here too.

generation_number: a query can be regenerated (Reasoning Sandbox, F36) after
the user tweaks enabled sources. Each regeneration writes a fresh answer /
reasoning trace / claims / trust score under the next generation_number, so
"latest" reads (the default) stay simple while "list all generations" reads
support compare-versions / replay-timeline in the sandbox.
"""

import uuid

from app.db.database import get_connection
from app.kan.interface import RoutingDecision
from app.trust_graph.schema import (
    AnswerRecord,
    ClaimRecord,
    ConfidenceEventRecord,
    QueryRecord,
    ReasoningStepRecord,
    RoutingDecisionRecord,
    SourceRecord,
    TrustScoreRecord,
)


def new_id() -> str:
    return str(uuid.uuid4())


async def create_query(raw_text: str, trust_slider_value: float) -> QueryRecord:
    query_id = new_id()
    conn = await get_connection()
    try:
        await conn.execute(
            "INSERT INTO queries (id, raw_text, trust_slider_value) VALUES (?, ?, ?)",
            (query_id, raw_text, trust_slider_value),
        )
        await conn.commit()
        cursor = await conn.execute("SELECT * FROM queries WHERE id = ?", (query_id,))
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return QueryRecord(**dict(row))


async def get_query(query_id: str) -> QueryRecord | None:
    conn = await get_connection()
    try:
        cursor = await conn.execute("SELECT * FROM queries WHERE id = ?", (query_id,))
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return QueryRecord(**dict(row)) if row else None


async def update_query_understanding(
    query_id: str, intent_summary: str, domain: str
) -> None:
    conn = await get_connection()
    try:
        await conn.execute(
            "UPDATE queries SET intent_summary = ?, domain = ? WHERE id = ?",
            (intent_summary, domain, query_id),
        )
        await conn.commit()
    finally:
        await conn.close()


async def save_routing_decision(
    query_id: str, decision: RoutingDecision
) -> RoutingDecisionRecord:
    decision_id = new_id()
    conn = await get_connection()
    try:
        await conn.execute(
            """
            INSERT INTO routing_decisions (
                id, query_id, complexity_score, ambiguity_score, hallucination_risk,
                needs_retrieval, needs_clarification, expected_confidence,
                token_budget, carbon_estimate_g, route, rationale
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                decision_id,
                query_id,
                decision.complexity_score,
                decision.ambiguity_score,
                decision.hallucination_risk,
                int(decision.needs_retrieval),
                int(decision.needs_clarification),
                decision.expected_confidence,
                decision.token_budget,
                decision.carbon_estimate_g,
                decision.route,
                decision.rationale,
            ),
        )
        await conn.commit()
        cursor = await conn.execute(
            "SELECT * FROM routing_decisions WHERE id = ?", (decision_id,)
        )
        row = await cursor.fetchone()
    finally:
        await conn.close()
    data = dict(row)
    data["needs_retrieval"] = bool(data["needs_retrieval"])
    data["needs_clarification"] = bool(data["needs_clarification"])
    return RoutingDecisionRecord(**data)


async def get_routing_decision(query_id: str) -> RoutingDecisionRecord | None:
    conn = await get_connection()
    try:
        cursor = await conn.execute(
            "SELECT * FROM routing_decisions WHERE query_id = ? ORDER BY created_at DESC LIMIT 1",
            (query_id,),
        )
        row = await cursor.fetchone()
    finally:
        await conn.close()
    if not row:
        return None
    data = dict(row)
    data["needs_retrieval"] = bool(data["needs_retrieval"])
    data["needs_clarification"] = bool(data["needs_clarification"])
    return RoutingDecisionRecord(**data)


async def get_latest_generation_number(query_id: str) -> int:
    conn = await get_connection()
    try:
        cursor = await conn.execute(
            "SELECT COALESCE(MAX(generation_number), 0) AS n FROM answers WHERE query_id = ?",
            (query_id,),
        )
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return row["n"]


async def save_answer(
    query_id: str, generation_number: int, text: str, route_used: str
) -> AnswerRecord:
    answer_id = new_id()
    conn = await get_connection()
    try:
        await conn.execute(
            "INSERT INTO answers (id, query_id, generation_number, text, route_used) VALUES (?, ?, ?, ?, ?)",
            (answer_id, query_id, generation_number, text, route_used),
        )
        await conn.commit()
        cursor = await conn.execute("SELECT * FROM answers WHERE id = ?", (answer_id,))
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return AnswerRecord(**dict(row))


async def get_answer(query_id: str, generation_number: int | None = None) -> AnswerRecord | None:
    conn = await get_connection()
    try:
        if generation_number is None:
            cursor = await conn.execute(
                "SELECT * FROM answers WHERE query_id = ? ORDER BY generation_number DESC LIMIT 1",
                (query_id,),
            )
        else:
            cursor = await conn.execute(
                "SELECT * FROM answers WHERE query_id = ? AND generation_number = ?",
                (query_id, generation_number),
            )
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return AnswerRecord(**dict(row)) if row else None


async def list_generations(query_id: str) -> list[AnswerRecord]:
    conn = await get_connection()
    try:
        cursor = await conn.execute(
            "SELECT * FROM answers WHERE query_id = ? ORDER BY generation_number ASC",
            (query_id,),
        )
        rows = await cursor.fetchall()
    finally:
        await conn.close()
    return [AnswerRecord(**dict(row)) for row in rows]


def _source_from_row(row) -> SourceRecord:
    data = dict(row)
    data["enabled"] = bool(data["enabled"])
    data["rejected"] = bool(data["rejected"])
    return SourceRecord(**data)


async def save_source(
    query_id: str,
    title: str | None,
    url_or_path: str | None,
    content: str | None,
    similarity: float | None,
    contribution_score: float | None,
) -> SourceRecord:
    source_id = new_id()
    conn = await get_connection()
    try:
        await conn.execute(
            """
            INSERT INTO sources (id, query_id, title, url_or_path, content, similarity, contribution_score)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (source_id, query_id, title, url_or_path, content, similarity, contribution_score),
        )
        await conn.commit()
        cursor = await conn.execute("SELECT * FROM sources WHERE id = ?", (source_id,))
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return _source_from_row(row)


async def list_sources(query_id: str) -> list[SourceRecord]:
    conn = await get_connection()
    try:
        cursor = await conn.execute(
            "SELECT * FROM sources WHERE query_id = ? ORDER BY contribution_score DESC",
            (query_id,),
        )
        rows = await cursor.fetchall()
    finally:
        await conn.close()
    return [_source_from_row(row) for row in rows]


async def list_enabled_sources(query_id: str) -> list[SourceRecord]:
    conn = await get_connection()
    try:
        cursor = await conn.execute(
            "SELECT * FROM sources WHERE query_id = ? AND enabled = 1 ORDER BY contribution_score DESC",
            (query_id,),
        )
        rows = await cursor.fetchall()
    finally:
        await conn.close()
    return [_source_from_row(row) for row in rows]


async def set_source_enabled(source_id: str, enabled: bool) -> SourceRecord | None:
    conn = await get_connection()
    try:
        await conn.execute(
            "UPDATE sources SET enabled = ? WHERE id = ?", (int(enabled), source_id)
        )
        await conn.commit()
        cursor = await conn.execute("SELECT * FROM sources WHERE id = ?", (source_id,))
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return _source_from_row(row) if row else None


async def save_reasoning_step(
    query_id: str,
    generation_number: int,
    stage: str,
    step_order: int,
    summary: str,
    confidence: float | None,
) -> ReasoningStepRecord:
    step_id = new_id()
    conn = await get_connection()
    try:
        await conn.execute(
            """
            INSERT INTO reasoning_steps (id, query_id, generation_number, stage, step_order, summary, confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (step_id, query_id, generation_number, stage, step_order, summary, confidence),
        )
        await conn.commit()
        cursor = await conn.execute(
            "SELECT * FROM reasoning_steps WHERE id = ?", (step_id,)
        )
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return ReasoningStepRecord(**dict(row))


async def list_reasoning_steps(
    query_id: str, generation_number: int | None = None
) -> list[ReasoningStepRecord]:
    conn = await get_connection()
    try:
        if generation_number is None:
            generation_number = await get_latest_generation_number(query_id)
        cursor = await conn.execute(
            "SELECT * FROM reasoning_steps WHERE query_id = ? AND generation_number = ? ORDER BY step_order ASC",
            (query_id, generation_number),
        )
        rows = await cursor.fetchall()
    finally:
        await conn.close()
    return [ReasoningStepRecord(**dict(row)) for row in rows]


async def save_confidence_event(
    query_id: str,
    generation_number: int,
    reasoning_step_id: str | None,
    confidence_before: float,
    confidence_after: float,
    reason: str,
) -> ConfidenceEventRecord:
    event_id = new_id()
    conn = await get_connection()
    try:
        await conn.execute(
            """
            INSERT INTO confidence_events
                (id, query_id, generation_number, reasoning_step_id, confidence_before, confidence_after, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (event_id, query_id, generation_number, reasoning_step_id, confidence_before, confidence_after, reason),
        )
        await conn.commit()
        cursor = await conn.execute(
            "SELECT * FROM confidence_events WHERE id = ?", (event_id,)
        )
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return ConfidenceEventRecord(**dict(row))


async def list_confidence_events(
    query_id: str, generation_number: int | None = None
) -> list[ConfidenceEventRecord]:
    conn = await get_connection()
    try:
        if generation_number is None:
            generation_number = await get_latest_generation_number(query_id)
        cursor = await conn.execute(
            "SELECT * FROM confidence_events WHERE query_id = ? AND generation_number = ? ORDER BY created_at ASC",
            (query_id, generation_number),
        )
        rows = await cursor.fetchall()
    finally:
        await conn.close()
    return [ConfidenceEventRecord(**dict(row)) for row in rows]


async def save_claim(
    query_id: str,
    generation_number: int,
    text: str,
    status: str,
    verification_notes: str | None,
    span_start: int | None,
    span_end: int | None,
) -> ClaimRecord:
    claim_id = new_id()
    conn = await get_connection()
    try:
        await conn.execute(
            """
            INSERT INTO claims (id, query_id, generation_number, text, status, verification_notes, span_start, span_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (claim_id, query_id, generation_number, text, status, verification_notes, span_start, span_end),
        )
        await conn.commit()
        cursor = await conn.execute("SELECT * FROM claims WHERE id = ?", (claim_id,))
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return ClaimRecord(**dict(row))


async def list_claims(query_id: str, generation_number: int | None = None) -> list[ClaimRecord]:
    conn = await get_connection()
    try:
        if generation_number is None:
            generation_number = await get_latest_generation_number(query_id)
        cursor = await conn.execute(
            "SELECT * FROM claims WHERE query_id = ? AND generation_number = ? ORDER BY span_start ASC",
            (query_id, generation_number),
        )
        rows = await cursor.fetchall()
    finally:
        await conn.close()
    return [ClaimRecord(**dict(row)) for row in rows]


async def save_trust_score(
    query_id: str,
    generation_number: int,
    overall_trust: float,
    verification_score: float | None,
    freshness_score: float | None,
    reasoning_depth_score: float | None,
    plain_english_summary: str,
) -> TrustScoreRecord:
    score_id = new_id()
    conn = await get_connection()
    try:
        await conn.execute(
            """
            INSERT INTO trust_scores
                (id, query_id, generation_number, overall_trust, verification_score, freshness_score,
                 reasoning_depth_score, plain_english_summary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                score_id,
                query_id,
                generation_number,
                overall_trust,
                verification_score,
                freshness_score,
                reasoning_depth_score,
                plain_english_summary,
            ),
        )
        await conn.commit()
        cursor = await conn.execute("SELECT * FROM trust_scores WHERE id = ?", (score_id,))
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return TrustScoreRecord(**dict(row))


async def get_trust_score(
    query_id: str, generation_number: int | None = None
) -> TrustScoreRecord | None:
    conn = await get_connection()
    try:
        if generation_number is None:
            cursor = await conn.execute(
                "SELECT * FROM trust_scores WHERE query_id = ? ORDER BY generation_number DESC LIMIT 1",
                (query_id,),
            )
        else:
            cursor = await conn.execute(
                "SELECT * FROM trust_scores WHERE query_id = ? AND generation_number = ?",
                (query_id, generation_number),
            )
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return TrustScoreRecord(**dict(row)) if row else None
