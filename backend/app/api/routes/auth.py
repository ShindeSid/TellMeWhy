from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.auth.service import AuthError, get_current_user, login, logout, signup

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str


class AuthResponse(BaseModel):
    user: UserResponse
    token: str


def _extract_token(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return authorization.split(" ", 1)[1].strip()


@router.post("/signup", response_model=AuthResponse, status_code=201)
async def signup_route(payload: AuthRequest) -> AuthResponse:
    try:
        user, token = await signup(payload.email, payload.password)
    except AuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return AuthResponse(user=UserResponse(id=user.id, email=user.email), token=token)


@router.post("/login", response_model=AuthResponse)
async def login_route(payload: AuthRequest) -> AuthResponse:
    try:
        user, token = await login(payload.email, payload.password)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return AuthResponse(user=UserResponse(id=user.id, email=user.email), token=token)


@router.post("/logout", status_code=204)
async def logout_route(authorization: str | None = Header(default=None)) -> None:
    token = _extract_token(authorization)
    if token:
        await logout(token)


@router.get("/me", response_model=UserResponse | None)
async def me_route(authorization: str | None = Header(default=None)) -> UserResponse | None:
    token = _extract_token(authorization)
    user = await get_current_user(token)
    return UserResponse(id=user.id, email=user.email) if user else None
