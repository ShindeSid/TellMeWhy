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

from app.core.config import get_settings
from app.demo.scenarios import find_scenario_for_query
from app.routing.llm_clients import DemoLLMClient, GeminiClient
from app.trust_graph.schema import RoutingDecisionRecord


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
    def __init__(self, llm_client: GeminiClient | DemoLLMClient | None = None) -> None:
        if llm_client is not None:
            self._llm = llm_client
        elif get_settings().demo_mode:
            self._llm = DemoLLMClient()
        else:
            self._llm = GeminiClient()

    async def execute(self, query_text: str, decision: RoutingDecisionRecord) -> GenerationResult:
        if decision.route == "rag":
            chunks = await self._retrieve_chunks(query_text)
            context = self._join_chunks(chunks)
            answer = await self._generate_with_context(query_text, context)
            return GenerationResult(answer_text=answer, context_used=context, retrieved_chunks=chunks)

        answer = await self._llm.generate(query_text, large=decision.route == "large_llm")
        return GenerationResult(answer_text=answer, context_used=None)

    async def regenerate_with_sources(
        self,
        query_text: str,
        decision: RoutingDecisionRecord,
        source_texts: list[str],
        extra_instruction: str | None = None,
    ) -> GenerationResult:
        if decision.route != "rag":
            answer = await self._llm.generate(
                self._augment_prompt(query_text, extra_instruction), large=decision.route == "large_llm"
            )
            return GenerationResult(answer_text=answer, context_used=None)

        context = (
            self._join_chunk_texts(source_texts)
            if source_texts
            else "(no sources are currently enabled - say the answer cannot be grounded in evidence)"
        )
        answer = await self._generate_with_context(query_text, context, extra_instruction)
        return GenerationResult(answer_text=answer, context_used=context)

    def _augment_prompt(self, query_text: str, extra_instruction: str | None) -> str:
        if not extra_instruction:
            return query_text
        return f"{query_text}\n\n{extra_instruction}"

    async def _generate_with_context(
        self, query_text: str, context: str, extra_instruction: str | None = None
    ) -> str:
        prompt = (
            f"Context:\n{context}\n\n"
            f"Question: {query_text}\n\n"
            "Answer using only the context above. If the context is insufficient, say so."
        )
        if extra_instruction:
            prompt = f"{prompt}\n\n{extra_instruction}"
        return await self._llm.generate(prompt, large=True)

    def _join_chunks(self, chunks: list[RetrievedChunk]) -> str:
        return self._join_chunk_texts([c.text for c in chunks])

    def _join_chunk_texts(self, texts: list[str]) -> str:
        return "\n\n".join(texts) if texts else "(no indexed sources yet)"

    async def _retrieve_chunks(self, query_text: str) -> list[RetrievedChunk]:
        if get_settings().demo_mode:
            scenario = find_scenario_for_query(query_text)
            if scenario and scenario.chunks:
                return [
                    RetrievedChunk(text=c.text, title=c.title, url=None, similarity=0.9)
                    for c in scenario.chunks
                ]
            return [
                RetrievedChunk(
                    text="(Demo Mode: no preset sources for this query.)",
                    title="Demo Mode",
                    url=None,
                    similarity=None,
                )
            ]

        try:
            from app.db.chroma_client import get_sources_collection
        except ImportError as exc:
            raise RAGUnavailableError(
                "chromadb is not installed in this environment. Run "
                "'pip install -r requirements.txt' in backend/ to install it."
            ) from exc

        collection = get_sources_collection()
        results = collection.query(query_texts=[query_text], n_results=5)
        docs = results.get("documents", [[]])[0]
        distances = (results.get("distances") or [[]])[0] or [None] * len(docs)
        metadatas = (results.get("metadatas") or [[]])[0] or [{}] * len(docs)

        chunks = []
        for doc, dist, meta in zip(docs, distances, metadatas):
            meta = meta or {}
            similarity = round(1 - dist, 3) if dist is not None else None
            title = meta.get("title") or (doc[:60] + "..." if len(doc) > 60 else doc)
            chunks.append(RetrievedChunk(text=doc, title=title, url=meta.get("source"), similarity=similarity))
        return chunks
