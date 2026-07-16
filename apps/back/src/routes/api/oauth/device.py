# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

from typing import Annotated

from fastapi import APIRouter, Form

from src.managers.oauth import parse_oauth_scope
from src.serializes.oauth import OauthDeviceAuthorizationResponse
from src.settings import get_settings
from src.utils.dependencies import OauthManagerDep

router = APIRouter()


@router.post(
    "/device/authorize",
    operation_id="api.oauth.device.authorize",
    summary="Device authorization endpoint",
    description="Start the device flow (RFC 8628). Returns a device code and a user code to enter at the verification URI.",
    response_model=OauthDeviceAuthorizationResponse,
)
def device_authorize(
    manager: OauthManagerDep,
    client_id: Annotated[str, Form()],
    scope: Annotated[str | None, Form()] = None,
) -> OauthDeviceAuthorizationResponse:
    settings = get_settings()
    client = manager.load_client(client_id)
    request = manager.start_device_authorization(client, scope=parse_oauth_scope(scope))
    app_url = settings.app_url.rstrip("/")
    return OauthDeviceAuthorizationResponse(
        device_code=request.device_code or "",
        user_code=request.user_code or "",
        verification_uri=f"{app_url}/connect-application",
        verification_uri_complete=f"{app_url}/connect-application?userCode={request.user_code}",
        expires_in=settings.oauth_device_code_ttl_seconds,
        interval=request.polling_interval_seconds or settings.oauth_device_polling_interval_seconds,
    )
