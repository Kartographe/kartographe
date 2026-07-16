# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

from datetime import UTC, datetime

from fastapi import APIRouter, status

from src.forms.oauth import OauthClientRegistrationForm
from src.serializes.oauth import OauthClientRegistrationResponse
from src.utils.dependencies import OauthManagerDep

router = APIRouter()


@router.post(
    "/register",
    operation_id="api.oauth.register",
    summary="Register an OAuth client",
    description="Dynamic client registration (RFC 7591). Returns the client id (and secret for confidential clients).",
    response_model=OauthClientRegistrationResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
def register(
    form: OauthClientRegistrationForm, manager: OauthManagerDep
) -> OauthClientRegistrationResponse:
    client, secret = manager.register_client(
        client_name=form.client_name,
        redirect_uris=form.redirect_uris,
        grant_types=form.grant_types,
        response_types=form.response_types,
        token_endpoint_auth_method=form.token_endpoint_auth_method,
        software_id=form.software_id,
        software_version=form.software_version,
    )
    issued_at = int((client.created_at or datetime.now(tz=UTC)).timestamp())
    return OauthClientRegistrationResponse(
        client_id=str(client.id),
        client_secret=secret,
        client_id_issued_at=issued_at,
        client_secret_expires_at=0 if secret else None,
        client_name=client.name,
        redirect_uris=client.redirect_uris,
        grant_types=client.grant_types,
        response_types=client.response_types,
        token_endpoint_auth_method=client.token_endpoint_auth_method,
    )
