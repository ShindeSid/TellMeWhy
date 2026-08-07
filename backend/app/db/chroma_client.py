import chromadb

from app.core.config import get_settings

_client: chromadb.ClientAPI | None = None


def get_chroma_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        settings = get_settings()
        _client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return _client


def get_sources_collection() -> chromadb.Collection:
    return get_chroma_client().get_or_create_collection("sources")
