"""DB access for users/sessions - deliberately separate from
app/trust_graph/graph_store.py since auth isn't part of the reasoning
domain that module owns."""

import uuid
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel

from app.db.database import get_connection

SESSION_LIFETIME = timedelta(days=7)


class UserRecord(BaseModel):
    id: str
    email: str
    password_hash: str
    created_at: str


def new_id() -> str:
    return str(uuid.uuid4())


async def create_user(email: str, password_hash: str) -> UserRecord:
    user_id = new_id()
    conn = await get_connection()
    try:
        await conn.execute(
            "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
            (user_id, email.lower(), password_hash),
        )
        await conn.commit()
        cursor = await conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return UserRecord(**dict(row))


async def get_user_by_email(email: str) -> UserRecord | None:
    conn = await get_connection()
    try:
        cursor = await conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return UserRecord(**dict(row)) if row else None


async def get_user_by_id(user_id: str) -> UserRecord | None:
    conn = await get_connection()
    try:
        cursor = await conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return UserRecord(**dict(row)) if row else None


async def create_session(user_id: str) -> str:
    token = uuid.uuid4().hex + uuid.uuid4().hex  # 64 hex chars, unguessable
    expires_at = (datetime.now(timezone.utc) + SESSION_LIFETIME).isoformat()
    conn = await get_connection()
    try:
        await conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires_at),
        )
        await conn.commit()
    finally:
        await conn.close()
    return token


async def get_user_by_session(token: str) -> UserRecord | None:
    conn = await get_connection()
    try:
        cursor = await conn.execute(
            "SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id "
            "WHERE sessions.token = ? AND sessions.expires_at > ?",
            (token, datetime.now(timezone.utc).isoformat()),
        )
        row = await cursor.fetchone()
    finally:
        await conn.close()
    return UserRecord(**dict(row)) if row else None


async def delete_session(token: str) -> None:
    conn = await get_connection()
    try:
        await conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        await conn.commit()
    finally:
        await conn.close()
