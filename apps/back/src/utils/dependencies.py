"""Value-producing FastAPI dependencies.

Everything a handler consumes as a *value* lives here (session, request IP,
current user, managers), so routes import from a single place:
`from src.utils.dependencies import CurrentUserDep, SessionDep`.

Guards that *reject* a request (raise to deny) live in `middlewares.py` instead.
"""

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from src.database import get_session
from src.managers.auth import AuthManager
from src.models.enum import UserStatus
from src.models.user import User
from src.managers.token import UserTokenManager

SessionDep = Annotated[Session, Depends(get_session)]


def _extract_request_ip(request: Request) -> str | None:
    """Client IP, honoring the first hop of `X-Forwarded-For` behind a proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


RequestIp = Annotated[str | None, Depends(_extract_request_ip)]


# Declaring the scheme (even with `auto_error=False`) is what makes Scalar show
# the lock icon + Bearer hint and emits `components.securitySchemes` in
# openapi.json. Rejection stays in `get_current_user` so the message is ours.
_user_bearer = HTTPBearer(
    scheme_name="UserBearer",
    bearerFormat="JWT",
    description="Access token returned by the login endpoints.",
    auto_error=False,
)


def get_current_user(
    session: SessionDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_user_bearer)],
) -> User:
    """Resolve the authenticated user from the `Authorization: Bearer` access token."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required.")

    payload, _ = UserTokenManager.decode_access(credentials.credentials)
    raw_id = (payload or {}).get("user", {}).get("id")
    if not raw_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token.")

    user = session.exec(select(User).where(User.id == uuid.UUID(raw_id), User.enabled.is_(True))).first()
    if user is None or user.status != UserStatus.ACTIVE:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token.")

    # A rotated token_control (e.g. after a password reset) invalidates every
    # token issued before the rotation.
    if payload.get("user", {}).get("tokenControl") != user.token_control:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session has expired. Please sign in again.")

    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def get_auth_manager(session: SessionDep, request_ip: RequestIp) -> AuthManager:
    return AuthManager(session, request_ip)


AuthManagerDep = Annotated[AuthManager, Depends(get_auth_manager)]
