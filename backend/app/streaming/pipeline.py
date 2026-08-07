"""
PipelineRunner: the streaming orchestrator. It calls the exact same
functions the existing non-streaming REST path (app/api/routes/query.py)
calls - HeuristicCognitiveRouter, AdaptiveRoutingEngine, verify_claims,
graph_store.save_* - nothing here reimplements business logic beyond what's
needed to pause mid-pipeline for Human-in-the-Loop confidence recovery.

Known trade-off: the stage-confidence formula below intentionally mirrors
app/explanation/recorder.py's formula rather than importing it, because
recorder.py builds its stage list only after generation is fully complete
(it can't run incrementally without a larger refactor). Consolidating these
into one shared pure function is a good follow-up cleanup, not done here to
keep this diff reviewable.

HITL design note: verification must be computed as a *preview* (pure
verify_claims/split_into_claims calls, no DB writes) before the
confidence-drop decision is made, then persisted exactly once with whichever
claims turn out to be final. Persisting immediately (like the non-streaming
verify_answer() wrapper does) and then possibly re-verifying after a
confidence-recovery pass would leave orphaned duplicate claim rows for the
same generation - list_claims() has no way to know the first pass was
superseded.
"""

import asyncio

from app.routing.adaptive_engine import AdaptiveRoutingEngine, RAGUnavailableError
from app.routing.llm_clients import GeminiUnavailableError
from app.streaming.bus import RunEventBus
from app.streaming.events import EventType
from app.streaming.registry import RunHandle
from app.trust_graph import graph_store
from app.trust_graph.schema import ClaimRecord
from app.verification.claim_splitter import split_into_claims
from app.verification.verifier import ClaimVerification, score_from_claims, verify_claims

_engine = AdaptiveRoutingEngine()

_HITL_MIN_DROP = 0.10
_HITL_MAX_TRIGGER_CONFIDENCE = 0.70
_HITL_TIMEOUT_SECONDS = 5


async def _stream_answer(bus: RunEventBus, chunks) -> str:
    """Drains a generate_*_stream() async generator, emitting ANSWER_CHUNK
    per chunk (Feature 1: 'stream the answer paragraph by paragraph') and
    returning the fully accumulated text once the stream ends."""
    text = ""
    async for chunk in chunks:
        text += chunk
        await bus.emit(EventType.ANSWER_CHUNK, text=chunk, accumulated_length=len(text))
    return text


async def _save_stage(
    query_id: str,
    generation_number: int,
    bus: RunEventBus,
    stage: str,
    summary: str,
    prev_confidence: float,
    confidence: float,
) -> None:
    step = await graph_store.save_reasoning_step(query_id, generation_number, stage, 0, summary, confidence)
    if confidence != prev_confidence:
        await graph_store.save_confidence_event(
            query_id, generation_number, step.id, prev_confidence, confidence, f"{stage.capitalize()}: {summary}"
        )
    await bus.emit(
        EventType.CONFIDENCE_UPDATED,
        stage=stage,
        summary=summary,
        confidence=confidence,
        confidence_before=prev_confidence,
        confidence_delta=round(confidence - prev_confidence, 3),
    )


def _verification_summary(claims: list[ClaimVerification]) -> str:
    if not claims:
        return "No atomic claims were extracted from the answer."
    counts = {"verified": 0, "weak": 0, "unsupported": 0}
    for c in claims:
        counts[c.status] = counts.get(c.status, 0) + 1
    return (
        f"Split into {len(claims)} claim(s): {counts['verified']} verified, "
        f"{counts['weak']} weak, {counts['unsupported']} unsupported "
        "(heuristic lexical-overlap check against retrieved context, not semantic fact-checking)."
    )


async def _persist_claims(
    query_id: str, generation_number: int, verifications: list[ClaimVerification]
) -> list[ClaimRecord]:
    return [
        await graph_store.save_claim(
            query_id, generation_number, v.text, v.status, v.notes, v.span_start, v.span_end
        )
        for v in verifications
    ]


async def run_answer(query_id: str, generation_number: int, bus: RunEventBus, run_handle: RunHandle) -> None:
    try:
        await bus.emit(EventType.QUERY_RECEIVED, query_id=query_id)

        query = await graph_store.get_query(query_id)
        decision = await graph_store.get_routing_decision(query_id)
        if not query or not decision:
            await bus.emit(EventType.ERROR, detail="Query or routing decision not found")
            return

        await bus.emit(
            EventType.KAN_COMPLETED,
            route=decision.route,
            domain=query.domain,
            complexity=decision.complexity_score,
            ambiguity=decision.ambiguity_score,
            hallucination_risk=decision.hallucination_risk,
            expected_confidence=decision.expected_confidence,
            rationale=decision.rationale,
        )

        expected_confidence = decision.expected_confidence or 0.5
        intent_conf = 0.4
        await _save_stage(
            query_id, generation_number, bus, "intent",
            f"Parsed the query. Detected domain '{query.domain or 'general'}', ambiguity {decision.ambiguity_score:.2f}.",
            intent_conf, intent_conf,
        )

        planning_conf = round(min(0.95, intent_conf + (expected_confidence - intent_conf) * 0.4), 2)
        await _save_stage(
            query_id, generation_number, bus, "planning",
            f"KAN selected the '{decision.route}' route (complexity {decision.complexity_score:.2f}). {decision.rationale}",
            intent_conf, planning_conf,
        )

        prev_conf = planning_conf
        chunks = None
        context_used = None
        if decision.route == "rag":
            await bus.emit(EventType.RETRIEVAL_STARTED)
            try:
                chunks = await _engine.retrieve_chunks(query.raw_text, query.domain)
            except RAGUnavailableError as exc:
                await bus.emit(EventType.ERROR, detail=str(exc))
                return
            for chunk in chunks:
                await bus.emit(EventType.SOURCE_RETRIEVED, title=chunk.title, similarity=chunk.similarity, url=chunk.url)
            await bus.emit(EventType.RETRIEVAL_COMPLETED, count=len(chunks))

            retrieval_conf = round(min(0.95, planning_conf + 0.1), 2)
            await _save_stage(
                query_id, generation_number, bus, "retrieval",
                "Retrieved supporting context for the RAG pipeline.", prev_conf, retrieval_conf,
            )
            prev_conf = retrieval_conf
            context_used = _engine.join_chunks(chunks)

            await bus.emit(EventType.GENERATING_RESPONSE)
            try:
                answer_text = await _stream_answer(
                    bus, _engine.generate_with_context_stream(query.raw_text, context_used)
                )
            except GeminiUnavailableError as exc:
                await bus.emit(EventType.ERROR, detail=str(exc))
                return
        else:
            await bus.emit(EventType.GENERATING_RESPONSE)
            try:
                answer_text = await _stream_answer(
                    bus, _engine.generate_direct_stream(query.raw_text, large=decision.route == "large_llm")
                )
            except GeminiUnavailableError as exc:
                await bus.emit(EventType.ERROR, detail=str(exc))
                return

        reasoning_conf = round(expected_confidence, 2)
        await _save_stage(
            query_id, generation_number, bus, "reasoning",
            f"Generated a draft answer using the {decision.route} pipeline ({len(answer_text)} chars).",
            prev_conf, reasoning_conf,
        )
        await bus.emit(EventType.REASONING_COMPLETED, length=len(answer_text))

        await bus.emit(EventType.CLAIM_EXTRACTION_STARTED)
        verifications = verify_claims(split_into_claims(answer_text), context_used)
        verification_score = score_from_claims(verifications)
        had_sources = context_used is not None
        if verification_score is not None and had_sources:
            verification_conf = round((reasoning_conf + verification_score) / 2, 2)
        else:
            verification_conf = reasoning_conf

        # --- Human-in-the-Loop confidence recovery (Feature 2) ---
        recovered = False
        if (
            decision.route == "rag"
            and (reasoning_conf - verification_conf) >= _HITL_MIN_DROP
            and verification_conf < _HITL_MAX_TRIGGER_CONFIDENCE
        ):
            await bus.emit(
                EventType.CONFIDENCE_DROP,
                previous=reasoning_conf,
                current=verification_conf,
                stage="verification",
                reason=_verification_summary(verifications),
                completed_stages=["intent", "planning", "retrieval"],
            )
            await bus.emit(EventType.WAITING_FOR_USER_INPUT, timeout_seconds=_HITL_TIMEOUT_SECONDS)

            try:
                await asyncio.wait_for(run_handle.resume_event.wait(), timeout=_HITL_TIMEOUT_SECONDS)
            except asyncio.TimeoutError:
                pass
            run_handle.resume_event.clear()
            payload = run_handle.resume_payload or {}
            run_handle.resume_payload = None

            if payload.get("source_added"):
                await bus.emit(EventType.USER_SOURCE_UPLOADED)
                try:
                    chunks = await _engine.retrieve_chunks(query.raw_text, query.domain)
                except RAGUnavailableError as exc:
                    await bus.emit(EventType.ERROR, detail=str(exc))
                    return
                await bus.emit(EventType.RAG_UPDATED, count=len(chunks))
                context_used = _engine.join_chunks(chunks)

                await bus.emit(EventType.GENERATING_RESPONSE)
                try:
                    answer_text = await _stream_answer(
                        bus, _engine.generate_with_context_stream(query.raw_text, context_used)
                    )
                except GeminiUnavailableError as exc:
                    await bus.emit(EventType.ERROR, detail=str(exc))
                    return

                verifications = verify_claims(split_into_claims(answer_text), context_used)
                verification_score = score_from_claims(verifications)
                new_conf = (
                    round((reasoning_conf + verification_score) / 2, 2)
                    if verification_score is not None
                    else reasoning_conf
                )
                await bus.emit(
                    EventType.CONFIDENCE_RECOVERED,
                    previous=verification_conf,
                    current=new_conf,
                    delta=round(new_conf - verification_conf, 3),
                    reason="User-provided document strengthened the supporting evidence.",
                )
                verification_conf = new_conf
                recovered = True

            await bus.emit(EventType.REASONING_RESUMED, recovered=recovered)

        # --- Persist exactly once, using whichever claims/answer are final ---
        answer = await graph_store.save_answer(query_id, generation_number, answer_text, decision.route)
        if chunks and decision.route == "rag":
            for chunk in chunks:
                await graph_store.save_source(
                    query_id, title=chunk.title, url_or_path=chunk.url, content=chunk.text,
                    similarity=chunk.similarity, contribution_score=chunk.similarity,
                )

        claims = await _persist_claims(query_id, generation_number, verifications)
        for claim in claims:
            await bus.emit(
                EventType.CLAIM_VERIFIED,
                claim_id=claim.id, text=claim.text, status=claim.status, notes=claim.verification_notes,
                span_start=claim.span_start, span_end=claim.span_end,
            )

        await _save_stage(
            query_id, generation_number, bus, "verification", _verification_summary(verifications),
            reasoning_conf, verification_conf,
        )
        await _save_stage(
            query_id, generation_number, bus, "answer", "Finalized answer returned to the user.",
            verification_conf, verification_conf,
        )

        overall_trust = verification_conf
        reasoning_depth_score = round(6 / 6, 2) if decision.route == "rag" else round(5 / 6, 2)
        if verification_score is not None and had_sources:
            plain_english_summary = (
                f"Overall trust is {overall_trust:.0%}, combining the router's pre-generation estimate "
                f"with claim verification ({verification_score:.0%} of claims checked out against "
                "retrieved sources)." + (" This reflects a user-added source." if recovered else "")
            )
        elif verification_score is not None:
            plain_english_summary = (
                f"Overall trust is {overall_trust:.0%}. No external sources were retrieved for this "
                "route, so claims could only be flagged as unverified rather than checked."
            )
        else:
            plain_english_summary = f"This is a preliminary confidence estimate ({overall_trust:.0%})."

        trust_score = await graph_store.save_trust_score(
            query_id, generation_number, overall_trust=overall_trust, verification_score=verification_score,
            freshness_score=None, reasoning_depth_score=reasoning_depth_score,
            plain_english_summary=plain_english_summary,
        )
        await bus.emit(
            EventType.TRUST_UPDATED,
            overall_trust=trust_score.overall_trust,
            verification_score=trust_score.verification_score,
            reasoning_depth_score=trust_score.reasoning_depth_score,
            plain_english_summary=trust_score.plain_english_summary,
            recovered=recovered,
        )

        await bus.emit(
            EventType.ANSWER_COMPLETED,
            answer_id=answer.id, text=answer.text, route_used=answer.route_used,
            generation_number=generation_number,
        )

    except Exception as exc:  # noqa: BLE001 - last-resort guard so the SSE stream always terminates
        await bus.emit(EventType.ERROR, detail=str(exc))


async def run_regenerate(
    query_id: str,
    generation_number: int,
    bus: RunEventBus,
    extra_instruction: str | None = None,
) -> None:
    """Streaming version of the Reasoning Sandbox regenerate/improve paths
    (F36/F24). No HITL pause here by design for this pass - a regenerate is
    already the user's own deliberate action, not a fresh answer they're
    seeing for the first time."""
    try:
        await bus.emit(EventType.QUERY_RECEIVED, query_id=query_id)

        query = await graph_store.get_query(query_id)
        decision = await graph_store.get_routing_decision(query_id)
        if not query or not decision:
            await bus.emit(EventType.ERROR, detail="Query or routing decision not found")
            return

        await bus.emit(EventType.KAN_COMPLETED, route=decision.route, domain=query.domain)

        intent_conf = 0.4
        await _save_stage(query_id, generation_number, bus, "intent", "Re-running with updated sources.", intent_conf, intent_conf)
        expected_confidence = decision.expected_confidence or 0.5
        planning_conf = round(min(0.95, intent_conf + (expected_confidence - intent_conf) * 0.4), 2)
        await _save_stage(
            query_id, generation_number, bus, "planning",
            f"Re-using the '{decision.route}' route from the original answer.", intent_conf, planning_conf,
        )

        prev_conf = planning_conf
        context_used = None
        if decision.route == "rag":
            enabled_sources = await graph_store.list_enabled_sources(query_id)
            source_texts = [s.content for s in enabled_sources if s.content]
            await bus.emit(EventType.RAG_UPDATED, count=len(source_texts))
            retrieval_conf = round(min(0.95, planning_conf + 0.1), 2)
            await _save_stage(
                query_id, generation_number, bus, "retrieval",
                "Reused previously retrieved sources, filtered to the ones currently enabled "
                "(Reasoning Sandbox regeneration - no new vector search was run).",
                prev_conf, retrieval_conf,
            )
            prev_conf = retrieval_conf

            try:
                result = await _engine.regenerate_with_sources(
                    query.raw_text, decision, source_texts, extra_instruction=extra_instruction
                )
            except (GeminiUnavailableError, RAGUnavailableError) as exc:
                await bus.emit(EventType.ERROR, detail=str(exc))
                return
            answer_text = result.answer_text
            context_used = result.context_used
        else:
            try:
                result = await _engine.regenerate_with_sources(
                    query.raw_text, decision, [], extra_instruction=extra_instruction
                )
            except (GeminiUnavailableError, RAGUnavailableError) as exc:
                await bus.emit(EventType.ERROR, detail=str(exc))
                return
            answer_text = result.answer_text

        reasoning_conf = round(expected_confidence, 2)
        await bus.emit(EventType.GENERATING_RESPONSE)
        await _save_stage(
            query_id, generation_number, bus, "reasoning",
            f"Generated a revised answer using the {decision.route} pipeline ({len(answer_text)} chars).",
            prev_conf, reasoning_conf,
        )
        await bus.emit(EventType.REASONING_COMPLETED, length=len(answer_text))

        answer = await graph_store.save_answer(query_id, generation_number, answer_text, decision.route)

        await bus.emit(EventType.CLAIM_EXTRACTION_STARTED)
        verifications = verify_claims(split_into_claims(answer_text), context_used)
        verification_score = score_from_claims(verifications)
        had_sources = context_used is not None
        verification_conf = (
            round((reasoning_conf + verification_score) / 2, 2)
            if verification_score is not None and had_sources
            else reasoning_conf
        )

        claims = await _persist_claims(query_id, generation_number, verifications)
        for claim in claims:
            await bus.emit(
                EventType.CLAIM_VERIFIED,
                claim_id=claim.id, text=claim.text, status=claim.status, notes=claim.verification_notes,
                span_start=claim.span_start, span_end=claim.span_end,
            )

        await _save_stage(
            query_id, generation_number, bus, "verification", _verification_summary(verifications),
            reasoning_conf, verification_conf,
        )
        await _save_stage(
            query_id, generation_number, bus, "answer", "Finalized revised answer.", verification_conf, verification_conf,
        )

        overall_trust = verification_conf
        plain_english_summary = f"Overall trust is {overall_trust:.0%} for this revised answer."
        trust_score = await graph_store.save_trust_score(
            query_id, generation_number, overall_trust=overall_trust, verification_score=verification_score,
            freshness_score=None, reasoning_depth_score=1.0, plain_english_summary=plain_english_summary,
        )
        await bus.emit(
            EventType.TRUST_UPDATED,
            overall_trust=trust_score.overall_trust,
            verification_score=trust_score.verification_score,
            reasoning_depth_score=trust_score.reasoning_depth_score,
            plain_english_summary=trust_score.plain_english_summary,
        )
        await bus.emit(
            EventType.ANSWER_COMPLETED,
            answer_id=answer.id, text=answer.text, route_used=answer.route_used,
            generation_number=generation_number,
        )

    except Exception as exc:  # noqa: BLE001
        await bus.emit(EventType.ERROR, detail=str(exc))
