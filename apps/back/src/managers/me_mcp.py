"""User-facing MCP consent logic (the SPA authorize/grants endpoints)."""

import secrets
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlmodel import Session, select

from src.managers.mcp_oauth import (
    MCPOAuthManager,
    build_authorization_code_redirect,
    build_authorization_denied_redirect,
)
from src.models.enum import (
    McpAuthorizationFlowType,
    McpAuthorizationRequestStatus,
    McpGrantScope,
    McpGrantStatus,
)
from src.models.user import User
from src.models.user_mcp_authorization_request import UserMcpAuthorizationRequest
from src.models.user_mcp_grant import UserMcpGrant


def _now() -> datetime:
    return datetime.now(tz=UTC)


class MeMCPManager:
    def __init__(self, session: Session):
        self.session = session
        self._oauth = MCPOAuthManager(session)

    def _guard_pending(self, request: UserMcpAuthorizationRequest) -> UserMcpAuthorizationRequest:
        # Lazily flip a stale PENDING request to EXPIRED.
        if request.status == McpAuthorizationRequestStatus.PENDING and request.expires_at is not None:
            expires = request.expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=UTC)
            if expires < _now():
                request.status = McpAuthorizationRequestStatus.EXPIRED
                self.session.add(request)
        if request.status != McpAuthorizationRequestStatus.PENDING:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This authorization request is no longer pending.")
        return request

    def fetch_pending_by_user_code(self, user_code: str) -> UserMcpAuthorizationRequest:
        request = self.session.exec(
            select(UserMcpAuthorizationRequest).where(
                UserMcpAuthorizationRequest.user_code == user_code.upper(),
                UserMcpAuthorizationRequest.enabled.is_(True),
            )
        ).first()
        if request is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown code.")
        return self._guard_pending(request)

    def approve(self, request: UserMcpAuthorizationRequest, *, user: User, scope: McpGrantScope) -> dict:
        self._guard_pending(request)
        now = _now()
        request.user_id = user.id
        request.approved_scope = scope
        request.status = McpAuthorizationRequestStatus.APPROVED
        request.approved_at = now
        redirect_url: str | None = None
        if request.flow_type == McpAuthorizationFlowType.AUTHORIZATION_CODE:
            request.authorization_code = secrets.token_urlsafe(32)
            redirect_url = build_authorization_code_redirect(request, code=request.authorization_code)
        self.session.add(request)
        return {"redirect_url": redirect_url}

    def deny(self, request: UserMcpAuthorizationRequest, *, user: User) -> dict:
        self._guard_pending(request)
        request.user_id = user.id
        request.status = McpAuthorizationRequestStatus.DENIED
        redirect_url: str | None = None
        if request.flow_type == McpAuthorizationFlowType.AUTHORIZATION_CODE:
            redirect_url = build_authorization_denied_redirect(request)
        self.session.add(request)
        return {"redirect_url": redirect_url}

    def list_for_user(self, user: User) -> list[UserMcpGrant]:
        return list(
            self.session.exec(
                select(UserMcpGrant)
                .where(
                    UserMcpGrant.user_id == user.id,
                    UserMcpGrant.status == McpGrantStatus.ACTIVE,
                    UserMcpGrant.enabled.is_(True),
                )
                .order_by(UserMcpGrant.created_at.desc())
            ).all()
        )

    def get_owned_grant(self, user: User, grant_id: uuid.UUID) -> UserMcpGrant:
        grant = self.session.get(UserMcpGrant, grant_id)
        if grant is None or grant.user_id != user.id or not grant.enabled:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
        return grant

    def revoke_grant(self, grant: UserMcpGrant) -> None:
        self._oauth.revoke_grant(grant)
