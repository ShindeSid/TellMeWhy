from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import claims, demo, knowledge, query, reasoning, sources, trust
from app.core.config import get_settings
from app.db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="TellMeWhy API", version="0.1.0", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(query.router)
app.include_router(reasoning.router)
app.include_router(claims.router)
app.include_router(trust.router)
app.include_router(sources.router)
app.include_router(demo.router)
app.include_router(knowledge.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
