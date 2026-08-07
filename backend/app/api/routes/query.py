from fastapi import APIRouter, HTTPException
from google.api_core.exceptions import GoogleAPICallError

from app.explanation.recorder import record_reasoning_trace
from app.kan import HeuristicCognitiveRouter, QueryInput
from app.models.schemas import (
    AnswerResponse,
    GenerationListResponse,
    QueryCreateRequest,
    QueryCreateResponse,
    QueryDetailResponse,
)
from app.routing.adaptive_engine import AdaptiveRoutingEngine, GenerationResult, RAGUnavailableError
from app.routing.llm_clients import GeminiUnavailableError
from app.trust_graph import graph_store
from app.trust_graph.schema import RoutingDecisionRecord
from app.understanding.service import analyze_query
from app.verification.service import verify_answer

router = APIRouter(prefix="/api/queries", tags=["queries"])

_router = HeuristicCognitiveRouter()
_engine = AdaptiveRoutingEngine()


@router.post("", response_model=QueryCreateResponse, status_code=201)
async def create_query(payload: QueryCreateRequest) -> QueryCreateResponse:
    query = await graph_store.create_query(payload.text, payload.trust_slider_value)

    decision = _router.analyze(
        QueryInput(
            text=payload.text,
            trust_slider_value=payload.trust_slider_value,
            has_uploaded_sources=payload.has_uploaded_sources,
        )
    )
    decision_record = await graph_store.save_routing_decision(query.id, decision)

    understanding = await analyze_query(payload.text)
    await graph_store.update_query_understanding(
        query.id, intent_summary=understanding.intent_summary, domain=decision.domain
    )
    await graph_store.update_query_analysis(
        query.id,
        entities=understanding.entities,
        missing_information=understanding.missing_information,
        alternative_interpretations=understanding.alternative_interpretations,
    )

    return QueryCreateResponse(
        query_id=query.id,
        raw_text=query.raw_text,
        routing_decision=decision_record,
        understanding=understanding,
    )


@router.get("/{query_id}", response_model=QueryDetailResponse)
async def get_query(query_id: str) -> QueryDetailResponse:
    query = await graph_store.get_query(query_id)
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    decision = await graph_store.get_routing_decision(query_id)
    return QueryDetailResponse.from_query_record(query, decision)


async def _finalize_generation(
    query_id: str,
    generation_number: int,
    decision: RoutingDecisionRecord,
    result: GenerationResult,
) -> AnswerResponse:
    answer = await graph_store.save_answer(
        query_id, generation_number, result.answer_text, decision.route
    )

    if result.retrieved_chunks:
        for chunk in result.retrieved_chunks:
            await graph_store.save_source(
                query_id,
                title=chunk.title,
                url_or_path=chunk.url,
                content=chunk.text,
                similarity=chunk.similarity,
                contribution_score=chunk.similarity,
            )

    claims, verification_score = await verify_answer(
        query_id, generation_number, result.answer_text, result.context_used
    )
    await record_reasoning_trace(
        query_id,
        generation_number,
        decision,
        result.answer_text,
        claims,
        verification_score,
        had_sources=result.context_used is not None,
    )
    return AnswerResponse(query_id=query_id, answer=answer)


@router.post("/{query_id}/answer", response_model=AnswerResponse)
async def generate_answer(query_id: str) -> AnswerResponse:
    query = await graph_store.get_query(query_id)
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    decision = await graph_store.get_routing_decision(query_id)
    if not decision:
        raise HTTPException(status_code=409, detail="Query has no routing decision yet")

    if await graph_store.get_latest_generation_number(query_id) > 0:
        raise HTTPException(
            status_code=409,
            detail="An answer already exists for this query. Use /regenerate to produce a new version.",
        )

    try:
        result = await _engine.execute(query.raw_text, decision, domain=query.domain)
    except (GeminiUnavailableError, RAGUnavailableError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GoogleAPICallError as exc:
        raise HTTPException(
            status_code=502, detail=f"Gemini API rejected the request: {exc.message}"
        ) from exc

    return await _finalize_generation(query_id, 1, decision, result)


async def _regenerate(query_id: str, extra_instruction: str | None = None) -> AnswerResponse:
    query = await graph_store.get_query(query_id)
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    decision = await graph_store.get_routing_decision(query_id)
    if not decision:
        raise HTTPException(status_code=409, detail="Query has no routing decision yet")

    latest_generation = await graph_store.get_latest_generation_number(query_id)
    if latest_generation == 0:
        raise HTTPException(
            status_code=409, detail="No prior answer to regenerate from - call /answer first."
        )

    enabled_sources = await graph_store.list_enabled_sources(query_id)
    source_texts = [s.content for s in enabled_sources if s.content]

    try:
        result = await _engine.regenerate_with_sources(
            query.raw_text, decision, source_texts, extra_instruction=extra_instruction
        )
    except (GeminiUnavailableError, RAGUnavailableError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GoogleAPICallError as exc:
        raise HTTPException(
            status_code=502, detail=f"Gemini API rejected the request: {exc.message}"
        ) from exc

    return await _finalize_generation(query_id, latest_generation + 1, decision, result)


@router.post("/{query_id}/regenerate", response_model=AnswerResponse)
async def regenerate_answer(query_id: str) -> AnswerResponse:
    """Reasoning Sandbox (F36): re-run generation using whichever sources are
    currently enabled, without re-querying the vector store. Disabling a
    source and calling this is what makes 'remove a source, see the answer
    change' actually happen."""
    return await _regenerate(query_id)


@router.post("/{query_id}/claims/{claim_id}/improve", response_model=AnswerResponse)
async def improve_claim(query_id: str, claim_id: str) -> AnswerResponse:
    """Highlight -> Improve (F24): regenerates the answer with a targeted
    instruction to fix or remove one specific unverified/weak claim, instead
    of a generic 'try again'. Not a literal text-splice of just that
    paragraph (too fragile across regenerations) - it's a full regeneration
    steered at one problem, which is an honest reading of 'improve this part'
    within what a single LLM call can reliably do."""
    claim = await graph_store.get_claim(claim_id)
    if not claim or claim.query_id != query_id:
        raise HTTPException(status_code=404, detail="Claim not found for this query")

    instruction = (
        f'The previous answer included this statement, which could not be well supported: '
        f'"{claim.text}"'
        + (f" ({claim.verification_notes})" if claim.verification_notes else "")
        + " Revise the answer to fix, better support, or remove that statement, while keeping "
        "the rest as accurate as before."
    )
    return await _regenerate(query_id, extra_instruction=instruction)


@router.get("/{query_id}/generations", response_model=GenerationListResponse)
async def list_generations(query_id: str) -> GenerationListResponse:
    query = await graph_store.get_query(query_id)
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    generations = await graph_store.list_generations(query_id)
    return GenerationListResponse(query_id=query_id, generations=generations)
