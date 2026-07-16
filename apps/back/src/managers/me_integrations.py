# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""User-facing OAuth consent logic (the SPA authorize/grants endpoints)."""

import secrets
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlmodel import Session, select

from src.managers.oauth import (
    OauthManager,
    build_authorization_code_redirect,
    build_authorization_denied_redirect,
)
from src.models.enum import (
    OauthAuthorizationFlowType,
    OauthAuthorizationRequestStatus,
    OauthGrantScope,
    OauthGrantStatus,
)
from src.models.oauth_authorization_request import OauthAuthorizationRequest
from src.models.oauth_grant import OauthGrant
from src.models.user import User


def _now() -> datetime:
    return datetime.now(tz=UTC)


class MeIntegrationsManager:
    def __init__(self, session: Session):
        self.session = session
        self._oauth = OauthManager(session)

    def _guard_pending(self, request: OauthAuthorizationRequest) -> OauthAuthorizationRequest:
        # Lazily flip a stale PENDING request to EXPIRED.
        if request.status == OauthAuthorizationRequestStatus.PENDING and request.expires_at is not None:
            expires = request.expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=UTC)
            if expires < _now():
                request.status = OauthAuthorizationRequestStatus.EXPIRED
                self.session.add(request)
        if request.status != OauthAuthorizationRequestStatus.PENDING:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This authorization request is no longer pending.")
        return request

    def fetch_pending_by_user_code(self, user_code: str) -> OauthAuthorizationRequest:
        request = self.session.exec(
            select(OauthAuthorizationRequest).where(
                OauthAuthorizationRequest.user_code == user_code.upper(),
                OauthAuthorizationRequest.enabled.is_(True),
            )
        ).first()
        if request is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown code.")
        return self._guard_pending(request)

    def approve(self, request: OauthAuthorizationRequest, *, user: User, scope: OauthGrantScope) -> dict:
        self._guard_pending(request)
        now = _now()
        request.user_id = user.id
        request.approved_scope = scope
        request.status = OauthAuthorizationRequestStatus.APPROVED
        request.approved_at = now
        redirect_url: str | None = None
        if request.flow_type == OauthAuthorizationFlowType.AUTHORIZATION_CODE:
            request.authorization_code = secrets.token_urlsafe(32)
            redirect_url = build_authorization_code_redirect(request, code=request.authorization_code)
        self.session.add(request)
        return {"redirect_url": redirect_url}

    def deny(self, request: OauthAuthorizationRequest, *, user: User) -> dict:
        self._guard_pending(request)
        request.user_id = user.id
        request.status = OauthAuthorizationRequestStatus.DENIED
        redirect_url: str | None = None
        if request.flow_type == OauthAuthorizationFlowType.AUTHORIZATION_CODE:
            redirect_url = build_authorization_denied_redirect(request)
        self.session.add(request)
        return {"redirect_url": redirect_url}

    def list_for_user(self, user: User) -> list[OauthGrant]:
        return list(
            self.session.exec(
                select(OauthGrant)
                .where(
                    OauthGrant.user_id == user.id,
                    OauthGrant.status == OauthGrantStatus.ACTIVE,
                    OauthGrant.enabled.is_(True),
                )
                .order_by(OauthGrant.created_at.desc())
            ).all()
        )

    def get_owned_grant(self, user: User, grant_id: uuid.UUID) -> OauthGrant:
        grant = self.session.get(OauthGrant, grant_id)
        if grant is None or grant.user_id != user.id or not grant.enabled:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
        return grant

    def revoke_grant(self, grant: OauthGrant) -> None:
        self._oauth.revoke_grant(grant)
