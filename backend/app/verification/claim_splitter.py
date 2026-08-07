"""Splits a generated answer into atomic claims (F27). Deliberately a plain
sentence splitter, not an LLM call — claim *verification* needs judgment,
but claim *segmentation* doesn't, and keeping this heuristic means it works
even when the Gemini key is unavailable."""

import re

from pydantic import BaseModel

_SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])\s+")
_MIN_WORDS = 3


class ClaimSpan(BaseModel):
    text: str
    span_start: int
    span_end: int


def split_into_claims(answer_text: str) -> list[ClaimSpan]:
    claims: list[ClaimSpan] = []
    cursor = 0
    for sentence in _SENTENCE_BOUNDARY.split(answer_text.strip()):
        sentence = sentence.strip()
        if not sentence:
            continue
        start = answer_text.index(sentence, cursor)
        end = start + len(sentence)
        cursor = end
        if len(sentence.split()) >= _MIN_WORDS:
            claims.append(ClaimSpan(text=sentence, span_start=start, span_end=end))
    return claims
