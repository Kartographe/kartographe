"""MCP transport gating: validate the bearer token against an active grant.

Two layers use this:
- `MCPBearerMiddleware` gates the `/mcp` Streamable HTTP transport (but skips
  `/mcp/oauth/*` so the OAuth flow stays reachable without a token).
- `get_current_user` / `CurrentMCPGrantDep` re-validate on the `/v1/*` handlers
  that fastapi-mcp dispatches tool calls to (the middleware doesn't see those).
"""

import json
import uuid
from datetime import UTC, datetime

from sqlmodel import Session

from src.database import engine
from src.managers.token import McpAccessTokenManager
from src.models.enum import McpGrantScope, McpGrantStatus
from src.models.user_mcp_grant import UserMcpGrant

_WRITE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


class MCPBearerError(Exception):
    """A `WWW-Authenticate`-carrying MCP auth failure."""

    def __init__(self, error: str, description: str, *, status_code: int = 401):
        self.error = error
        self.error_description = description
        self.status_code = status_code
        super().__init__(description)

    def www_authenticate(self) -> str:
        return f'Bearer realm="mcp", error="{self.error}", error_description="{self.error_description}"'


def load_mcp_grant_from_token(
    session: Session,
    token: str,
    *,
    http_method: str,
    check_scope: bool = True,
) -> UserMcpGrant:
    payload, _ = McpAccessTokenManager.decode(token)
    grant_block = (payload or {}).get("grant") or {}
    grant_id, control = grant_block.get("id"), grant_block.get("control")
    if not (grant_id and control):
        raise MCPBearerError("invalid_token", "Malformed or expired access token.")

    try:
        grant = session.get(UserMcpGrant, uuid.UUID(grant_id))
    except (ValueError, TypeError):
        grant = None
    if grant is None or not grant.enabled or grant.status != McpGrantStatus.ACTIVE:
        raise MCPBearerError("invalid_token", "The grant is no longer active.")
    if grant.grant_control != control:
        raise MCPBearerError("invalid_token", "This token was superseded by a refresh.")

    if check_scope and grant.scope == McpGrantScope.READ and http_method.upper() in _WRITE_METHODS:
        raise MCPBearerError("insufficient_scope", "This grant is read-only.", status_code=403)

    grant.last_used_at = datetime.now(tz=UTC)
    session.add(grant)
    return grant


def _extract_bearer(scope) -> str | None:
    for name, value in scope.get("headers", []):
        if name == b"authorization":
            raw = value.decode("latin-1")
            if raw.lower().startswith("bearer "):
                return raw[7:].strip()
    return None


class MCPBearerMiddleware:
    """ASGI middleware gating the `/mcp` transport (skips `/mcp/oauth`)."""

    def __init__(self, app, mount_path: str):
        self.app = app
        self._mount = "/" + mount_path.strip("/")
        self._oauth_prefix = f"{self._mount}/oauth"

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http" or scope.get("method") == "OPTIONS":
            return await self.app(scope, receive, send)
        path = scope.get("path", "")
        if not path.startswith(self._mount) or path.startswith(self._oauth_prefix):
            return await self.app(scope, receive, send)

        token = _extract_bearer(scope)
        try:
            if not token:
                raise MCPBearerError("invalid_token", "A bearer token is required.")
            with Session(engine) as session:
                # Streamable HTTP multiplexes everything over POST, so scope is
                # enforced later on the real /v1 method, not here.
                load_mcp_grant_from_token(session, token, http_method=scope.get("method", "GET"), check_scope=False)
                session.commit()
        except MCPBearerError as error:
            return await self._deny(send, error)
        return await self.app(scope, receive, send)

    @staticmethod
    async def _deny(send, error: MCPBearerError) -> None:
        body = json.dumps({"error": error.error, "error_description": error.error_description}).encode()
        await send(
            {
                "type": "http.response.start",
                "status": error.status_code,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"www-authenticate", error.www_authenticate().encode("latin-1")),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})
