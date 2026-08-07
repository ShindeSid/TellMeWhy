from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    gemini_api_key: str = ""
    gemini_small_model: str = "gemini-2.5-flash"
    gemini_large_model: str = "gemini-2.5-pro"
    gemini_embedding_model: str = "text-embedding-004"

    database_url: str = "sqlite+aiosqlite:///./trust_graph.db"
    chroma_persist_dir: str = "./chroma_data"

    cors_origins: str = "http://localhost:3000"

    # When true, the Adaptive Routing Engine uses canned LLM responses and
    # canned retrieval chunks instead of calling Gemini/ChromaDB. Exists
    # because both are currently blocked in this dev environment (invalid
    # API key; chromadb needs MSVC Build Tools on Windows) — Demo Mode makes
    # the full real pipeline (KAN, verification, trust, sandbox) demoable
    # without either dependency working.
    demo_mode: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
