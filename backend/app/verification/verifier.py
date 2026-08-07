"""
Meta Verification Layer (F27). Never generates answers - only verifies
claims that already exist. Heuristic lexical-overlap check against
retrieved context, not semantic entailment; the verification_notes on each
claim say so explicitly rather than implying a stronger guarantee than the
method actually provides.
"""

import re

from pydantic import BaseModel

from app.verification.claim_splitter import ClaimSpan

ClaimStatus = str  # "verified" | "weak" | "unsupported"

_WORD = re.compile(r"[a-z0-9]+")
_STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "of", "to", "in", "on", "for",
    "and", "or", "it", "its", "this", "that", "as", "by", "with", "at", "be",
    "has", "have", "had", "not", "but", "which", "than",
}

_VERIFIED_THRESHOLD = 0.5
_WEAK_THRESHOLD = 0.2


class ClaimVerification(BaseModel):
    text: str
    span_start: int
    span_end: int
    status: ClaimStatus
    notes: str


def _tokenize(text: str) -> set[str]:
    return {w for w in _WORD.findall(text.lower()) if w not in _STOPWORDS}


def _lexical_overlap(claim_words: set[str], context_words: set[str]) -> float:
    if not claim_words:
        return 0.0
    return len(claim_words & context_words) / len(claim_words)


def verify_claims(claims: list[ClaimSpan], context: str | None) -> list[ClaimVerification]:
    if context is None:
        return [
            ClaimVerification(
                text=c.text,
                span_start=c.span_start,
                span_end=c.span_end,
                status="weak",
                notes="No external sources were retrieved for this route "
                "(only RAG queries retrieve). Confidence reflects the model's "
                "own output, not independent verification.",
            )
            for c in claims
        ]

    context_words = _tokenize(context)
    results = []
    for claim in claims:
        overlap = _lexical_overlap(_tokenize(claim.text), context_words)
        if overlap >= _VERIFIED_THRESHOLD:
            status: ClaimStatus = "verified"
            notes = f"{overlap:.0%} of the claim's key terms appear in the retrieved context."
        elif overlap >= _WEAK_THRESHOLD:
            status = "weak"
            notes = f"Only {overlap:.0%} of the claim's key terms appear in the retrieved context."
        else:
            status = "unsupported"
            notes = f"The claim's key terms are largely absent from the retrieved context ({overlap:.0%} overlap)."
        results.append(
            ClaimVerification(
                text=claim.text,
                span_start=claim.span_start,
                span_end=claim.span_end,
                status=status,
                notes=notes,
            )
        )
    return results


def score_from_claims(verifications: list[ClaimVerification]) -> float | None:
    if not verifications:
        return None
    weights = {"verified": 1.0, "weak": 0.5, "unsupported": 0.0}
    return round(sum(weights[v.status] for v in verifications) / len(verifications), 2)
