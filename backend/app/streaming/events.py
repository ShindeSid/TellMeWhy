"""
Event catalog for the streaming reasoning pipeline. Every name here maps to
a real call site in the existing pipeline (KAN router, AdaptiveRoutingEngine,
verification, Trust Graph writes) - nothing here is emitted on a timer or
fabricated to look like progress. See docs/architecture.md for the mapping
from spec-suggested events to what's actually genuine in this codebase
(e.g. no RERANKING_RESULTS - there is no reranking step).
"""

import json
import time
from dataclasses import dataclass, field
from typing import Any


class EventType:
    QUERY_RECEIVED = "QUERY_RECEIVED"
    KAN_COMPLETED = "KAN_COMPLETED"  # KAN decision + route selection (same instant in this codebase)
    RETRIEVAL_STARTED = "RETRIEVAL_STARTED"
    SOURCE_RETRIEVED = "SOURCE_RETRIEVED"  # one per chunk
    RETRIEVAL_COMPLETED = "RETRIEVAL_COMPLETED"
    GENERATING_RESPONSE = "GENERATING_RESPONSE"
    ANSWER_CHUNK = "ANSWER_CHUNK"  # paragraph-level, only when streaming generation is used
    REASONING_COMPLETED = "REASONING_COMPLETED"
    CLAIM_EXTRACTION_STARTED = "CLAIM_EXTRACTION_STARTED"
    CLAIM_VERIFIED = "CLAIM_VERIFIED"  # one per claim
    CONFIDENCE_UPDATED = "CONFIDENCE_UPDATED"
    TRUST_UPDATED = "TRUST_UPDATED"
    DECISION_SYNTHESIZED = "DECISION_SYNTHESIZED"  # V2: recommendation + plain-language confidence + key caveat
    ANSWER_COMPLETED = "ANSWER_COMPLETED"
    ERROR = "ERROR"

    # Human-in-the-loop (Feature 2)
    CONFIDENCE_DROP = "CONFIDENCE_DROP"
    WAITING_FOR_USER_INPUT = "WAITING_FOR_USER_INPUT"
    USER_SOURCE_UPLOADED = "USER_SOURCE_UPLOADED"
    DOCUMENT_PARSING = "DOCUMENT_PARSING"
    EMBEDDING_STARTED = "EMBEDDING_STARTED"
    EMBEDDING_COMPLETED = "EMBEDDING_COMPLETED"
    RAG_UPDATED = "RAG_UPDATED"
    CONFIDENCE_RECOVERED = "CONFIDENCE_RECOVERED"
    REASONING_RESUMED = "REASONING_RESUMED"


@dataclass
class ReasoningEvent:
    event: str
    data: dict[str, Any] = field(default_factory=dict)
    ts: float = field(default_factory=time.time)

    def to_sse(self) -> str:
        payload = json.dumps({"event": self.event, "ts": self.ts, **self.data})
        return f"event: {self.event}\ndata: {payload}\n\n"
