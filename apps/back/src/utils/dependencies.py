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
from src.managers.mcp_oauth import MCPOAuthManager
from src.managers.me import MeManager
from src.managers.me_mcp import MeMCPManager
from src.managers.me_security import MeSecurityManager
from src.managers.token import UserTokenManager
from src.models.enum import UserStatus
from src.models.user import User
from src.models.user_mcp_authorization_request import UserMcpAuthorizationRequest
from src.models.user_mcp_grant import UserMcpGrant
from src.utils.mcp_auth import MCPBearerError, load_mcp_grant_from_token

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


def _active_user_or_401(session: Session, user_id: uuid.UUID) -> User:
    user = session.exec(select(User).where(User.id == user_id, User.enabled.is_(True))).first()
    if user is None or user.status != UserStatus.ACTIVE:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token.")
    return user


def _load_user_from_mcp_token(request: Request, session: Session, token: str) -> User:
    # MCP access tokens are only accepted on the versioned tool surface.
    if not request.url.path.startswith("/v1"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This token cannot be used here.")
    try:
        grant = load_mcp_grant_from_token(session, token, http_method=request.method)
    except MCPBearerError as error:
        raise HTTPException(
            error.status_code,
            error.error_description,
            headers={"WWW-Authenticate": error.www_authenticate()},
        ) from error
    return _active_user_or_401(session, grant.user_id)


def get_current_user(
    request: Request,
    session: SessionDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_user_bearer)],
) -> User:
    """Resolve the authenticated user from a user access token **or** an MCP
    access token (the latter only on `/v1/*`, so the same handlers serve the SPA
    and MCP agents)."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required.")

    token = credentials.credentials
    payload, _ = UserTokenManager.decode_access(token)
    if payload is None:
        # Not a user token — try an MCP grant token.
        return _load_user_from_mcp_token(request, session, token)

    raw_id = payload.get("user", {}).get("id")
    if not raw_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token.")
    user = _active_user_or_401(session, uuid.UUID(raw_id))
    # A rotated token_control (e.g. after a password reset) invalidates every
    # token issued before the rotation.
    if payload.get("user", {}).get("tokenControl") != user.token_control:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session has expired. Please sign in again.")
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def get_auth_manager(session: SessionDep, request_ip: RequestIp) -> AuthManager:
    return AuthManager(session, request_ip)


AuthManagerDep = Annotated[AuthManager, Depends(get_auth_manager)]


def get_me_manager(session: SessionDep) -> MeManager:
    return MeManager(session)


MeManagerDep = Annotated[MeManager, Depends(get_me_manager)]


def get_me_security_manager(session: SessionDep) -> MeSecurityManager:
    return MeSecurityManager(session)


MeSecurityManagerDep = Annotated[MeSecurityManager, Depends(get_me_security_manager)]


# --- MCP ----------------------------------------------------------------

def get_mcp_oauth_manager(session: SessionDep) -> MCPOAuthManager:
    return MCPOAuthManager(session)


MCPOAuthManagerDep = Annotated[MCPOAuthManager, Depends(get_mcp_oauth_manager)]


def get_me_mcp_manager(session: SessionDep) -> MeMCPManager:
    return MeMCPManager(session)


MeMCPManagerDep = Annotated[MeMCPManager, Depends(get_me_mcp_manager)]


# Dedicated scheme so the MCP tool routes advertise their own Bearer in Scalar.
_mcp_bearer = HTTPBearer(
    scheme_name="MCPBearer",
    bearerFormat="JWT",
    description="MCP access token obtained through the OAuth flow.",
    auto_error=False,
)


def get_current_mcp_grant(
    request: Request,
    session: SessionDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_mcp_bearer)],
) -> UserMcpGrant:
    """Resolve the MCP grant behind the request (used by MCP tool routes, which
    fastapi-mcp dispatches internally so the transport middleware doesn't see)."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "A bearer token is required.",
            headers={"WWW-Authenticate": 'Bearer realm="mcp"'},
        )
    try:
        return load_mcp_grant_from_token(session, credentials.credentials, http_method=request.method)
    except MCPBearerError as error:
        raise HTTPException(
            error.status_code,
            error.error_description,
            headers={"WWW-Authenticate": error.www_authenticate()},
        ) from error


CurrentMCPGrantDep = Annotated[UserMcpGrant, Depends(get_current_mcp_grant)]


def get_current_mcp_user(session: SessionDep, grant: CurrentMCPGrantDep) -> User:
    return _active_user_or_401(session, grant.user_id)


CurrentMCPUserDep = Annotated[User, Depends(get_current_mcp_user)]


def get_current_me_mcp_authorization_request(
    request_id: uuid.UUID, session: SessionDep
) -> UserMcpAuthorizationRequest:
    authorization_request = session.get(UserMcpAuthorizationRequest, request_id)
    if authorization_request is None or not authorization_request.enabled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Authorization request not found.")
    return authorization_request


CurrentMeMCPAuthorizationRequestDep = Annotated[
    UserMcpAuthorizationRequest, Depends(get_current_me_mcp_authorization_request)
]
