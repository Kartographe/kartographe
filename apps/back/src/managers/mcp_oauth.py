"""MCP OAuth 2.1 authorization-server business logic.

Supports dynamic client registration (RFC 7591), the device flow (RFC 8628),
the authorization-code + PKCE flow (RFC 7636), refresh and revocation (RFC 7009).
Errors are raised as `MCPOAuthError` so routes render the OAuth `{error,
error_description}` envelope.
"""

import base64
import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from fastapi import HTTPException, status
from sqlmodel import Session, select

from src.managers.token import McpAccessTokenManager, McpRefreshTokenManager
from src.models.enum import (
    McpAuthorizationFlowType,
    McpAuthorizationRequestStatus,
    McpGrantScope,
    McpGrantStatus,
)
from src.models.user_mcp_authorization_request import UserMcpAuthorizationRequest
from src.models.user_mcp_client import UserMcpClient
from src.models.user_mcp_grant import UserMcpGrant
from src.settings import get_settings
from src.utils.passwords import hash_password, verify_password

_ALLOWED_AUTH_METHODS = frozenset({"none", "client_secret_post"})
_USER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no ambiguous characters


class MCPOAuthError(HTTPException):
    """An OAuth error rendered as `{error, error_description}`."""

    def __init__(self, error: str, description: str, *, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.error = error
        self.error_description = description
        super().__init__(status_code=status_code, detail=description)


def _now() -> datetime:
    return datetime.now(tz=UTC)


def _is_past(value: datetime | None) -> bool:
    if value is None:
        return False
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value < _now()


def parse_oauth_scope(raw: str | None) -> McpGrantScope:
    """Collapse a space-separated scope string to the strongest scope."""
    if not (raw and raw.strip()):
        return McpGrantScope.WRITE
    scopes: set[McpGrantScope] = set()
    for token in raw.split():
        if token == McpGrantScope.READ.value:
            scopes.add(McpGrantScope.READ)
        elif token == McpGrantScope.WRITE.value:
            scopes.add(McpGrantScope.WRITE)
        else:
            raise MCPOAuthError("invalid_scope", f"Unsupported scope: {token}")
    return McpGrantScope.WRITE if McpGrantScope.WRITE in scopes else McpGrantScope.READ


def _augment_redirect(uri: str, params: dict[str, str | None]) -> str:
    parts = urlparse(uri)
    query = dict(parse_qsl(parts.query))
    for key, value in params.items():
        if value is not None:
            query[key] = value
    return urlunparse(parts._replace(query=urlencode(query)))


def build_authorization_code_redirect(request: UserMcpAuthorizationRequest, *, code: str) -> str:
    return _augment_redirect(request.redirect_uri or "", {"code": code, "state": request.state})


def build_authorization_denied_redirect(request: UserMcpAuthorizationRequest) -> str:
    return _augment_redirect(request.redirect_uri or "", {"error": "access_denied", "state": request.state})


class MCPOAuthManager:
    def __init__(self, session: Session):
        self.session = session

    # ----------------------------------------------------------- helpers

    @staticmethod
    def _validate_redirect_uri_shape(uri: str) -> None:
        parts = urlparse(uri)
        if parts.fragment:
            raise MCPOAuthError("invalid_redirect_uri", "Redirect URIs must not contain a fragment.")
        if parts.scheme == "https":
            return
        if parts.scheme == "http" and parts.hostname in {"127.0.0.1", "localhost", "::1"}:
            return
        raise MCPOAuthError("invalid_redirect_uri", "Redirect URIs must be https or a loopback http URL.")

    def _generate_user_code(self) -> str:
        for _ in range(10):
            code = "-".join(
                "".join(secrets.choice(_USER_CODE_ALPHABET) for _ in range(4)) for _ in range(2)
            )
            exists = self.session.exec(
                select(UserMcpAuthorizationRequest).where(UserMcpAuthorizationRequest.user_code == code)
            ).first()
            if exists is None:
                return code
        raise MCPOAuthError("server_error", "Could not allocate a user code.", status_code=500)

    @staticmethod
    def _verify_pkce(code_challenge: str | None, code_verifier: str | None) -> None:
        if not (code_challenge and code_verifier):
            raise MCPOAuthError("invalid_grant", "Missing PKCE parameters.")
        digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
        expected = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
        if not secrets.compare_digest(expected, code_challenge):
            raise MCPOAuthError("invalid_grant", "PKCE verification failed.")

    def _tick_expiry(self, request: UserMcpAuthorizationRequest) -> None:
        if request.status == McpAuthorizationRequestStatus.PENDING and _is_past(request.expires_at):
            request.status = McpAuthorizationRequestStatus.EXPIRED
            self.session.add(request)

    def _mint_token_pair(self, grant: UserMcpGrant) -> dict:
        return {
            "access_token": McpAccessTokenManager(grant).generate(),
            "refresh_token": McpRefreshTokenManager(grant).generate(),
            "token_type": "Bearer",
            "expires_in": get_settings().mcp_oauth_access_token_ttl_seconds,
            "scope": grant.scope.value,
        }

    def _finalise_exchange(self, request: UserMcpAuthorizationRequest) -> dict:
        grant = UserMcpGrant(
            user_id=request.user_id,
            client_id=request.client_id,
            scope=request.approved_scope or request.requested_scope,
            status=McpGrantStatus.ACTIVE,
            grant_control=secrets.token_urlsafe(16),
        )
        self.session.add(grant)
        request.status = McpAuthorizationRequestStatus.CONSUMED
        request.consumed_at = _now()
        self.session.add(request)
        self.session.flush()
        return self._mint_token_pair(grant)

    def _load_grant(self, grant_id: str, control: str) -> UserMcpGrant:
        try:
            grant = self.session.get(UserMcpGrant, uuid.UUID(grant_id))
        except (ValueError, TypeError):
            grant = None
        if (
            grant is None
            or not grant.enabled
            or grant.status != McpGrantStatus.ACTIVE
            or grant.grant_control != control
        ):
            raise MCPOAuthError("invalid_grant", "The grant is no longer valid.")
        return grant

    # ----------------------------------------------------- client registration

    def register_client(
        self,
        *,
        client_name: str,
        redirect_uris: list[str],
        grant_types: list[str] | None,
        response_types: list[str] | None,
        token_endpoint_auth_method: str,
        software_id: str | None,
        software_version: str | None,
    ) -> tuple[UserMcpClient, str | None]:
        if token_endpoint_auth_method not in _ALLOWED_AUTH_METHODS:
            raise MCPOAuthError("invalid_client_metadata", "Unsupported token_endpoint_auth_method.")
        for uri in redirect_uris:
            self._validate_redirect_uri_shape(uri)

        plain_secret: str | None = None
        secret_hash: str | None = None
        if token_endpoint_auth_method != "none":
            plain_secret = secrets.token_urlsafe(32)
            secret_hash = hash_password(plain_secret)

        client = UserMcpClient(
            name=client_name,
            redirect_uris=redirect_uris,
            grant_types=grant_types or ["authorization_code", "refresh_token"],
            response_types=response_types or ["code"],
            token_endpoint_auth_method=token_endpoint_auth_method,
            client_secret_hash=secret_hash,
            software_id=software_id,
            software_version=software_version,
        )
        self.session.add(client)
        self.session.flush()
        return client, plain_secret

    def load_client(self, client_id: str) -> UserMcpClient:
        try:
            client = self.session.get(UserMcpClient, uuid.UUID(client_id))
        except (ValueError, TypeError):
            client = None
        if client is None or not client.enabled:
            raise MCPOAuthError("invalid_client", "Unknown client.", status_code=401)
        return client

    def authenticate_client(self, *, client_id: str, client_secret: str | None) -> UserMcpClient:
        client = self.load_client(client_id)
        if client.token_endpoint_auth_method == "none":
            return client
        if not (client_secret and verify_password(client.client_secret_hash, client_secret)):
            raise MCPOAuthError("invalid_client", "Client authentication failed.", status_code=401)
        return client

    # ------------------------------------------------------------ device flow

    def start_device_authorization(self, client: UserMcpClient, *, scope: McpGrantScope) -> UserMcpAuthorizationRequest:
        settings = get_settings()
        request = UserMcpAuthorizationRequest(
            flow_type=McpAuthorizationFlowType.DEVICE,
            status=McpAuthorizationRequestStatus.PENDING,
            client_id=client.id,
            requested_scope=scope,
            expires_at=_now() + timedelta(seconds=settings.mcp_oauth_device_code_ttl_seconds),
            device_code=secrets.token_urlsafe(32),
            user_code=self._generate_user_code(),
            polling_interval_seconds=settings.mcp_oauth_device_polling_interval_seconds,
        )
        self.session.add(request)
        self.session.flush()
        return request

    def exchange_device_code(self, client: UserMcpClient, *, device_code: str) -> dict:
        request = self.session.exec(
            select(UserMcpAuthorizationRequest).where(
                UserMcpAuthorizationRequest.device_code == device_code,
                UserMcpAuthorizationRequest.client_id == client.id,
                UserMcpAuthorizationRequest.flow_type == McpAuthorizationFlowType.DEVICE,
            )
        ).first()
        if request is None:
            raise MCPOAuthError("invalid_grant", "Unknown device code.")
        self._tick_expiry(request)
        if request.status == McpAuthorizationRequestStatus.PENDING:
            raise MCPOAuthError("authorization_pending", "The user has not yet approved this request.")
        if request.status == McpAuthorizationRequestStatus.DENIED:
            raise MCPOAuthError("access_denied", "The user denied the request.")
        if request.status == McpAuthorizationRequestStatus.EXPIRED:
            raise MCPOAuthError("expired_token", "The device code has expired.")
        if request.status != McpAuthorizationRequestStatus.APPROVED:
            raise MCPOAuthError("invalid_grant", "This device code cannot be exchanged.")
        return self._finalise_exchange(request)

    # -------------------------------------------------- authorization-code flow

    def start_authorization_code(
        self,
        client: UserMcpClient,
        *,
        redirect_uri: str,
        scope: McpGrantScope,
        state: str | None,
        code_challenge: str,
        code_challenge_method: str,
    ) -> UserMcpAuthorizationRequest:
        if code_challenge_method != "S256":
            raise MCPOAuthError("invalid_request", "Only the S256 PKCE method is supported.")
        if redirect_uri not in client.redirect_uris:
            raise MCPOAuthError("invalid_request", "redirect_uri is not registered for this client.")
        settings = get_settings()
        request = UserMcpAuthorizationRequest(
            flow_type=McpAuthorizationFlowType.AUTHORIZATION_CODE,
            status=McpAuthorizationRequestStatus.PENDING,
            client_id=client.id,
            requested_scope=scope,
            redirect_uri=redirect_uri,
            code_challenge=code_challenge,
            code_challenge_method=code_challenge_method,
            state=state,
            expires_at=_now() + timedelta(seconds=settings.mcp_oauth_authorization_code_ttl_seconds),
        )
        self.session.add(request)
        self.session.flush()
        return request

    def exchange_authorization_code(
        self, client: UserMcpClient, *, code: str, code_verifier: str | None, redirect_uri: str | None
    ) -> dict:
        request = self.session.exec(
            select(UserMcpAuthorizationRequest).where(
                UserMcpAuthorizationRequest.authorization_code == code,
                UserMcpAuthorizationRequest.client_id == client.id,
                UserMcpAuthorizationRequest.flow_type == McpAuthorizationFlowType.AUTHORIZATION_CODE,
            )
        ).first()
        if request is None or request.status != McpAuthorizationRequestStatus.APPROVED:
            raise MCPOAuthError("invalid_grant", "Invalid or already used authorization code.")
        if _is_past(request.expires_at):
            raise MCPOAuthError("invalid_grant", "The authorization code has expired.")
        if redirect_uri != request.redirect_uri:
            raise MCPOAuthError("invalid_grant", "redirect_uri mismatch.")
        self._verify_pkce(request.code_challenge, code_verifier)
        return self._finalise_exchange(request)

    # ---------------------------------------------------------------- refresh

    def refresh_access_token(self, *, refresh_token: str, client: UserMcpClient) -> dict:
        payload, _ = McpRefreshTokenManager.decode(refresh_token)
        grant_block = (payload or {}).get("grant") or {}
        grant_id, control = grant_block.get("id"), grant_block.get("control")
        if not (grant_id and control):
            raise MCPOAuthError("invalid_grant", "Invalid refresh token.")
        grant = self._load_grant(grant_id, control)
        if grant.client_id != client.id:
            raise MCPOAuthError("invalid_grant", "Refresh token was not issued to this client.")
        grant.grant_control = secrets.token_urlsafe(16)  # rotate → old tokens die
        grant.last_used_at = _now()
        self.session.add(grant)
        self.session.flush()
        return self._mint_token_pair(grant)

    # ------------------------------------------------------------- revocation

    def revoke_grant(self, grant: UserMcpGrant) -> None:
        now = _now()
        grant.status = McpGrantStatus.REVOKED
        grant.revoked_at = now
        grant.grant_control = secrets.token_urlsafe(16)
        grant.enabled = False
        grant.deleted_at = now
        self.session.add(grant)

    def revoke_token(self, client: UserMcpClient, *, token: str, token_type_hint: str | None) -> None:
        decoders = [McpAccessTokenManager.decode, McpRefreshTokenManager.decode]
        if token_type_hint == "refresh_token":
            decoders.reverse()
        for decode in decoders:
            payload, _ = decode(token)
            grant_block = (payload or {}).get("grant") or {}
            grant_id = grant_block.get("id")
            if not grant_id:
                continue
            try:
                grant = self.session.get(UserMcpGrant, uuid.UUID(grant_id))
            except (ValueError, TypeError):
                grant = None
            if grant is not None and grant.client_id == client.id and grant.enabled:
                self.revoke_grant(grant)
            return
