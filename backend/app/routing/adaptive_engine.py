"""
Adaptive Routing Engine (F11): executes the route a RoutingDecision already
chose. It does not re-decide anything - that's the KAN router's job - it
only dispatches: small LLM, large LLM, or RAG (retrieval + large LLM).

Also backs the Reasoning Sandbox (F36) regeneration path: `regenerate_with_sources`
rebuilds the RAG prompt from a caller-supplied set of already-retrieved chunk
texts (the currently-enabled sources) instead of re-querying the vector
store, so disabling a source and regenerating actually changes the prompt.
"""

from dataclasses import dataclass
from typing import AsyncIterator

from app.ingestion.connectors import search_by_domain
from app.routing.llm_clients import GeminiClient
from app.trust_graph.schema import RoutingDecisionRecord


_STYLE_INSTRUCTION = (
    "STRICT LENGTH LIMIT: keep your entire answer to at most 120 words (roughly 10-15 short lines). "
    "This is a hard constraint you must not exceed, even for broad or complex topics. For a broad "
    "conceptual question (e.g. 'What is X?'), that means ONLY a 2-4 sentence plain-language definition "
    "plus at most 2 short bullet points if truly needed - do NOT write a multi-section explainer "
    "covering history, multiple theories/models, sub-mechanisms, or a list of implications, even "
    "though you could. Pick the single most useful framing and stop there; the user can ask a "
    "follow-up if they want more depth. Write in short plain-prose paragraphs. Do not use headers (no "
    "# or ##), horizontal rules (no ---), tables, or LaTeX/math notation (no $$, no \\text{}). You may "
    "use **bold** for a couple of key terms and *italics* sparingly, but do not overuse markdown or "
    "add unnecessary structure."
)

# Runaway-cost safety net only, NOT a length-enforcement mechanism - the
# 120-word target above is enforced by the prompt instruction alone. A tight
# token cap was tried and reverted: gemini-2.5-flash spends an unpredictable,
# per-call-variable slice of max_output_tokens on internal "thinking" before
# any visible answer text, and this SDK version (google-generativeai 0.8.3)
# has no way to disable or budget that separately. The same prompt measured
# anywhere from 9 to 553 output tokens depending on how much thinking it did,
# so a tight cap risked silently truncating answers mid-sentence. 1500 is
# high enough to essentially never clip a compliant answer, while still
# bounding the worst case (an early, uninstructed test ran to ~1200 tokens).
_MAX_ANSWER_TOKENS = 1500


class RAGUnavailableError(RuntimeError):
    """Raised when the vector store (ChromaDB) isn't available in this environment."""


@dataclass
class RetrievedChunk:
    text: str
    title: str | None
    url: str | None
    similarity: float | None


@dataclass
class GenerationResult:
    answer_text: str
    context_used: str | None  # retrieved/reconstructed context, only set for the rag route
    retrieved_chunks: list[RetrievedChunk] | None = None  # only set on a fresh (non-regen) rag run


class AdaptiveRoutingEngine:
    def __init__(self, llm_client: GeminiClient | None = None) -> None:
        self._llm = llm_client if llm_client is not None else GeminiClient()

    async def execute(
        self, query_text: str, decision: RoutingDecisionRecord, domain: str | None = None
    ) -> GenerationResult:
        if decision.route == "rag":
            chunks = await self.retrieve_chunks(query_text, domain)
            context = self.join_chunks(chunks)
            answer = await self.generate_with_context(query_text, context)
            return GenerationResult(answer_text=answer, context_used=context, retrieved_chunks=chunks)

        answer = await self.generate_direct(query_text, large=decision.route == "large_llm")
        return GenerationResult(answer_text=answer, context_used=None)

    async def generate_direct(self, query_text: str, large: bool) -> str:
        """Public wrapper for the non-RAG generation call, so the streaming
        pipeline (app/streaming/pipeline.py) can trigger it without reaching
        into the private _llm attribute."""
        prompt = f"{_STYLE_INSTRUCTION}\n\nQuestion: {query_text}"
        return await self._llm.generate(prompt, large=large, max_output_tokens=_MAX_ANSWER_TOKENS)

    async def regenerate_with_sources(
        self,
        query_text: str,
        decision: RoutingDecisionRecord,
        source_texts: list[str],
        extra_instruction: str | None = None,
    ) -> GenerationResult:
        if decision.route != "rag":
            prompt = f"{_STYLE_INSTRUCTION}\n\nQuestion: {self._augment_prompt(query_text, extra_instruction)}"
            answer = await self._llm.generate(
                prompt, large=decision.route == "large_llm", max_output_tokens=_MAX_ANSWER_TOKENS
            )
            return GenerationResult(answer_text=answer, context_used=None)

        context = (
            self._join_chunk_texts(source_texts)
            if source_texts
            else "(no sources are currently enabled - say the answer cannot be grounded in evidence)"
        )
        answer = await self.generate_with_context(query_text, context, extra_instruction)
        return GenerationResult(answer_text=answer, context_used=context)

    def _augment_prompt(self, query_text: str, extra_instruction: str | None) -> str:
        if not extra_instruction:
            return query_text
        return f"{query_text}\n\n{extra_instruction}"

    async def generate_with_context(
        self, query_text: str, context: str, extra_instruction: str | None = None
    ) -> str:
        prompt = (
            f"{_STYLE_INSTRUCTION}\n\n"
            f"Context:\n{context}\n\n"
            f"Question: {query_text}\n\n"
            "Answer using only the context above. If the context is insufficient, say so."
        )
        if extra_instruction:
            prompt = f"{prompt}\n\n{extra_instruction}"
        return await self._llm.generate(prompt, large=True, max_output_tokens=_MAX_ANSWER_TOKENS)

    async def generate_direct_stream(self, query_text: str, large: bool) -> AsyncIterator[str]:
        prompt = f"{_STYLE_INSTRUCTION}\n\nQuestion: {query_text}"
        async for chunk in self._llm.generate_stream(prompt, large=large, max_output_tokens=_MAX_ANSWER_TOKENS):
            yield chunk

    async def generate_with_context_stream(
        self, query_text: str, context: str, extra_instruction: str | None = None
    ) -> AsyncIterator[str]:
        prompt = (
            f"{_STYLE_INSTRUCTION}\n\n"
            f"Context:\n{context}\n\n"
            f"Question: {query_text}\n\n"
            "Answer using only the context above. If the context is insufficient, say so."
        )
        if extra_instruction:
            prompt = f"{prompt}\n\n{extra_instruction}"
        async for chunk in self._llm.generate_stream(prompt, large=True, max_output_tokens=_MAX_ANSWER_TOKENS):
            yield chunk

    def join_chunks(self, chunks: list[RetrievedChunk]) -> str:
        return self._join_chunk_texts([c.text for c in chunks])

    def _join_chunk_texts(self, texts: list[str]) -> str:
        return "\n\n".join(texts) if texts else "(no indexed sources yet)"

    async def retrieve_chunks(self, query_text: str, domain: str | None = None) -> list[RetrievedChunk]:
        # Live external sources (Feature 3) - real HTTP calls, no fixed
        # cosine similarity like the vector-store hits below, so similarity
        # is left null rather than a fabricated number.
        external_chunks = [
            RetrievedChunk(text=doc.text, title=f"{doc.title} ({doc.source_name})", url=doc.url, similarity=None)
            for doc in await search_by_domain(query_text, domain)
        ]

        chroma_chunks: list[RetrievedChunk] = []
        try:
            from app.db.chroma_client import get_sources_collection

            collection = get_sources_collection()
            results = collection.query(query_texts=[query_text], n_results=5)
            docs = results.get("documents", [[]])[0]
            distances = (results.get("distances") or [[]])[0] or [None] * len(docs)
            metadatas = (results.get("metadatas") or [[]])[0] or [{}] * len(docs)
            for doc, dist, meta in zip(docs, distances, metadatas):
                meta = meta or {}
                similarity = round(1 - dist, 3) if dist is not None else None
                title = meta.get("title") or (doc[:60] + "..." if len(doc) > 60 else doc)
                chroma_chunks.append(
                    RetrievedChunk(text=doc, title=title, url=meta.get("source"), similarity=similarity)
                )
        except ImportError:
            # chromadb missing is only fatal if there's also nothing from
            # the live external sources to fall back on.
            if not external_chunks:
                raise RAGUnavailableError(
                    "chromadb is not installed in this environment, and no external "
                    "sources (Wikipedia/PubMed/arXiv/etc.) returned results either. Run "
                    "'pip install -r requirements.txt' in backend/ to install chromadb."
                ) from None

        combined = external_chunks + chroma_chunks
        if not combined:
            return [
                RetrievedChunk(
                    text="(No sources found - neither the uploaded knowledge base nor live "
                    "external search returned anything for this query.)",
                    title="No sources found", url=None, similarity=None,
                )
            ]
        return combined
