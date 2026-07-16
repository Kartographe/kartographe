# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

from typing import Annotated

from fastapi import APIRouter, Query
from fastapi.responses import RedirectResponse

from src.managers.oauth import OauthError, parse_oauth_scope
from src.settings import get_settings
from src.utils.dependencies import OauthManagerDep

router = APIRouter()


@router.get(
    "/authorize",
    operation_id="api.oauth.authorize",
    summary="Authorization endpoint (redirects to the consent screen)",
    description="Start the authorization-code + PKCE flow, then redirect the browser to the SPA consent page.",
    response_model=None,
    status_code=302,
)
def authorize(
    manager: OauthManagerDep,
    client_id: Annotated[str, Query()],
    redirect_uri: Annotated[str, Query()],
    code_challenge: Annotated[str, Query(min_length=43, max_length=128)],
    response_type: Annotated[str, Query()] = "code",
    code_challenge_method: Annotated[str, Query()] = "S256",
    scope: Annotated[str | None, Query()] = None,
    state: Annotated[str | None, Query()] = None,
) -> RedirectResponse:
    if response_type != "code":
        raise OauthError("unsupported_response_type", "Only the `code` response type is supported.")
    client = manager.load_client(client_id)
    authorization_request = manager.start_authorization_code(
        client,
        redirect_uri=redirect_uri,
        scope=parse_oauth_scope(scope),
        state=state,
        code_challenge=code_challenge,
        code_challenge_method=code_challenge_method,
    )
    app_url = get_settings().app_url.rstrip("/")
    return RedirectResponse(f"{app_url}/oauth/consent/{authorization_request.id}", status_code=302)
