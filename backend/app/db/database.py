from pathlib import Path

import aiosqlite

from app.core.config import get_settings

SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def _sqlite_path_from_url(database_url: str) -> str:
    # sqlite+aiosqlite:///./trust_graph.db -> ./trust_graph.db
    return database_url.split("///", 1)[1]


async def init_db() -> None:
    settings = get_settings()
    db_path = _sqlite_path_from_url(settings.database_url)
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    async with aiosqlite.connect(db_path) as db:
        await db.executescript(schema_sql)
        await db.commit()


async def get_connection() -> aiosqlite.Connection:
    settings = get_settings()
    db_path = _sqlite_path_from_url(settings.database_url)
    conn = await aiosqlite.connect(db_path)
    conn.row_factory = aiosqlite.Row
    return conn
