from app.trust_graph import graph_store
from app.trust_graph.schema import ClaimRecord
from app.verification.claim_splitter import split_into_claims
from app.verification.verifier import score_from_claims, verify_claims


async def verify_answer(
    query_id: str, generation_number: int, answer_text: str, context: str | None
) -> tuple[list[ClaimRecord], float | None]:
    claims = split_into_claims(answer_text)
    verifications = verify_claims(claims, context)

    records = [
        await graph_store.save_claim(
            query_id, generation_number, v.text, v.status, v.notes, v.span_start, v.span_end
        )
        for v in verifications
    ]
    return records, score_from_claims(verifications)
