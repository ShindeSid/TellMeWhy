"""Signup/login business logic. Passwords are bcrypt-hashed and never
logged, stored in plaintext, or returned in any response."""

import re

import bcrypt

from app.auth import store
from app.auth.store import UserRecord

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_MIN_PASSWORD_LENGTH = 8


class AuthError(Exception):
    pass


def _validate_email(email: str) -> str:
    email = email.strip().lower()
    if not _EMAIL_RE.match(email):
        raise AuthError("Enter a valid email address.")
    return email


def _validate_password(password: str) -> None:
    if len(password) < _MIN_PASSWORD_LENGTH:
        raise AuthError(f"Password must be at least {_MIN_PASSWORD_LENGTH} characters.")


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


async def signup(email: str, password: str) -> tuple[UserRecord, str]:
    email = _validate_email(email)
    _validate_password(password)

    if await store.get_user_by_email(email):
        raise AuthError("An account with this email already exists.")

    user = await store.create_user(email, _hash_password(password))
    token = await store.create_session(user.id)
    return user, token


async def login(email: str, password: str) -> tuple[UserRecord, str]:
    email = _validate_email(email)
    user = await store.get_user_by_email(email)
    if not user or not _verify_password(password, user.password_hash):
        raise AuthError("Incorrect email or password.")

    token = await store.create_session(user.id)
    return user, token


async def logout(token: str) -> None:
    await store.delete_session(token)


async def get_current_user(token: str | None) -> UserRecord | None:
    if not token:
        return None
    return await store.get_user_by_session(token)
