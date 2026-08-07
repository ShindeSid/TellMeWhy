"""
User Knowledge Sources (F3): turns an uploaded PDF, a URL, or pasted text
into chunks embedded in the same ChromaDB "sources" collection the RAG
pipeline already retrieves from - so anything uploaded here genuinely
becomes part of future retrieval, not a decorative upload widget.
"""

import io

import httpx
from bs4 import BeautifulSoup
from pypdf import PdfReader

from app.trust_graph import graph_store

CHUNK_SIZE = 800
CHUNK_OVERLAP = 100


class IngestionError(RuntimeError):
    """Raised when a file/URL can't be parsed into usable text."""


def extract_text_from_pdf(data: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(data))
        pages = [page.extract_text() or "" for page in reader.pages]
    except Exception as exc:
        raise IngestionError(f"Could not read PDF: {exc}") from exc
    text = "\n".join(pages).strip()
    if not text:
        raise IngestionError("No extractable text found in this PDF (it may be scanned images).")
    return text


async def extract_text_from_url(url: str) -> tuple[str, str]:
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers={"User-Agent": "TellMeWhy/1.0"})
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise IngestionError(f"Could not fetch URL: {exc}") from exc

    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    title = soup.title.string.strip() if soup.title and soup.title.string else url
    text = " ".join(soup.get_text(separator=" ").split())
    if not text:
        raise IngestionError("No readable text found at this URL.")
    return title, text


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        if end == len(text):
            break
        start = end - overlap
    return chunks


async def ingest_text(title: str, source_type: str, origin: str | None, text: str) -> int:
    """Chunks and embeds `text` into ChromaDB, records a knowledge_items row.
    Returns the number of chunks stored."""
    try:
        from app.db.chroma_client import get_sources_collection
    except ImportError as exc:
        raise IngestionError(
            "chromadb is not installed in this environment. Run "
            "'pip install -r requirements.txt' in backend/ to install it."
        ) from exc

    chunks = chunk_text(text)
    if not chunks:
        raise IngestionError("Nothing to store - the extracted text was empty.")

    collection = get_sources_collection()
    item_id = await graph_store.create_knowledge_item(title, source_type, origin, len(chunks))
    ids = [f"{item_id}-{i}" for i in range(len(chunks))]
    metadatas = [{"title": title, "source": origin or title, "knowledge_item_id": item_id} for _ in chunks]
    collection.add(documents=chunks, ids=ids, metadatas=metadatas)
    return len(chunks)
