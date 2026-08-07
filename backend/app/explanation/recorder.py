"""
Writes the reasoning trace (steps, confidence events, trust score) after an
answer is generated and verified. This is deliberately NOT the "Explanation
Engine" the architecture doc describes — that engine only *reads* the Trust
Graph. This module is the write side: it turns one real RoutingDecision,
one real generated answer, and (as of Milestone 6) real claim verification
results into the structured stages the frontend visualizes.

Honesty constraint: the "verification" stage and trust score only claim what
actually happened. Claim verification here is a heuristic lexical-overlap
check (app/verification/verifier.py), not semantic fact-checking — the
wording says so rather than implying a stronger guarantee.
"""

from app.trust_graph import graph_store
from app.trust_graph.schema import ClaimRecord, RoutingDecisionRecord


def _verification_summary(claims: list[ClaimRecord]) -> str:
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


async def record_reasoning_trace(
    query_id: str,
    generation_number: int,
    decision: RoutingDecisionRecord,
    answer_text: str,
    claims: list[ClaimRecord],
    verification_score: float | None,
    had_sources: bool,
) -> None:
    query = await graph_store.get_query(query_id)
    domain = query.domain if query and query.domain else "general"
    expected_confidence = decision.expected_confidence or 0.5

    stages: list[tuple[str, str, float]] = []

    intent_conf = 0.4
    stages.append((
        "intent",
        f"Parsed the query. Detected domain '{domain}', ambiguity {decision.ambiguity_score:.2f}.",
        intent_conf,
    ))

    planning_conf = round(min(0.95, intent_conf + (expected_confidence - intent_conf) * 0.4), 2)
    stages.append((
        "planning",
        f"KAN selected the '{decision.route}' route (complexity {decision.complexity_score:.2f}). {decision.rationale}",
        planning_conf,
    ))

    prev_conf = planning_conf
    if decision.route == "rag" or decision.needs_retrieval:
        retrieval_conf = round(min(0.95, planning_conf + 0.1), 2)
        retrieval_summary = (
            "Retrieved supporting context for the RAG pipeline."
            if generation_number == 1
            else "Reused previously retrieved sources, filtered to the ones currently enabled "
            "(Reasoning Sandbox regeneration — no new vector search was run)."
        )
        stages.append(("retrieval", retrieval_summary, retrieval_conf))
        prev_conf = retrieval_conf

    reasoning_conf = round(expected_confidence, 2)
    stages.append((
        "reasoning",
        f"Generated a draft answer using the {decision.route} pipeline ({len(answer_text)} chars).",
        reasoning_conf,
    ))

    # Verification stage confidence blends the pre-generation estimate with
    # what claim verification actually found against real sources. Without
    # sources, every claim defaults to "weak" — that's an absence of
    # evidence, not evidence of ~50% accuracy, so it must not move the score.
    if verification_score is not None and had_sources:
        verification_conf = round((reasoning_conf + verification_score) / 2, 2)
    else:
        verification_conf = reasoning_conf
    stages.append(("verification", _verification_summary(claims), verification_conf))

    stages.append(("answer", "Finalized answer returned to the user.", verification_conf))

    running_confidence = intent_conf
    for order, (stage, summary, confidence) in enumerate(stages):
        step = await graph_store.save_reasoning_step(
            query_id, generation_number, stage, order, summary, confidence
        )
        if confidence != running_confidence:
            await graph_store.save_confidence_event(
                query_id,
                generation_number,
                step.id,
                running_confidence,
                confidence,
                f"{stage.capitalize()} stage: {summary}",
            )
        running_confidence = confidence

    overall_trust = verification_conf
    reasoning_depth_score = round(len(stages) / 6, 2)

    if verification_score is not None and had_sources:
        plain_english_summary = (
            f"Overall trust is {overall_trust:.0%}, combining the router's pre-generation estimate "
            f"with claim verification ({verification_score:.0%} of claims checked out against "
            "retrieved sources). This is a heuristic check, not a guarantee of factual accuracy."
        )
    elif verification_score is not None and not had_sources:
        plain_english_summary = (
            f"Overall trust is {overall_trust:.0%}. No external sources were retrieved for this "
            "route, so claims could only be flagged as unverified rather than checked — this "
            "reflects the model's own output, not independent fact-checking."
        )
    else:
        plain_english_summary = (
            f"This is a preliminary confidence estimate ({overall_trust:.0%}) based on how the query "
            "was assessed before generation. No claims could be verified against external sources "
            "for this route — treat it as a rough signal, not a guarantee."
        )

    await graph_store.save_trust_score(
        query_id,
        generation_number,
        overall_trust=overall_trust,
        verification_score=verification_score,
        freshness_score=None,
        reasoning_depth_score=reasoning_depth_score,
        plain_english_summary=plain_english_summary,
    )
