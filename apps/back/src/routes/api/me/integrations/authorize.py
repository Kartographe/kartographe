from typing import Annotated

from fastapi import APIRouter, Path, status

from src.forms.me_integrations import MeIntegrationAuthorizeApproveForm
from src.models.oauth_authorization_request import OauthAuthorizationRequest
from src.serializes._base import ItemResponse
from src.serializes.errors import ErrorResponse
from src.serializes.me_integrations import (
    MeIntegrationAuthorizationRequestItem,
    MeIntegrationAuthorizeResponse,
)
from src.utils.dependencies import (
    CurrentMeIntegrationAuthorizationRequestDep,
    CurrentUserDep,
    MeIntegrationsManagerDep,
)

router = APIRouter(prefix="/me/integrations", tags=["api.me.integrations"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Not found"}}


def _to_item(request: OauthAuthorizationRequest) -> MeIntegrationAuthorizationRequestItem:
    return MeIntegrationAuthorizationRequestItem(
        id=request.id,
        client_name=request.client.name,
        flow_type=request.flow_type,
        requested_scope=request.requested_scope,
        redirect_uri=request.redirect_uri,
        expires_at=request.expires_at,
        state=request.state,
    )


@router.get(
    "/authorize/by-user-code/{user_code}",
    operation_id="api.me.integrations.authorize.byUserCode",
    summary="Look up a pending device-flow request by its user code",
    description="Resolve the pending authorization behind a device-flow user code, for the consent screen.",
    response_model=ItemResponse[MeIntegrationAuthorizationRequestItem],
    responses=_NOT_FOUND,
)
def by_user_code(
    user_code: Annotated[str, Path()],
    _user: CurrentUserDep,
    manager: MeIntegrationsManagerDep,
) -> ItemResponse[MeIntegrationAuthorizationRequestItem]:
    request = manager.fetch_pending_by_user_code(user_code)
    return ItemResponse(item=_to_item(request))


@router.get(
    "/authorize/{request_id}",
    operation_id="api.me.integrations.authorize.get",
    summary="Get a pending authorization request",
    description="Fetch the details shown on the consent screen for an authorization-code request.",
    response_model=ItemResponse[MeIntegrationAuthorizationRequestItem],
    responses=_NOT_FOUND,
)
def get_request(
    _user: CurrentUserDep,
    authorization_request: CurrentMeIntegrationAuthorizationRequestDep,
) -> ItemResponse[MeIntegrationAuthorizationRequestItem]:
    return ItemResponse(item=_to_item(authorization_request))


@router.post(
    "/authorize/{request_id}/approve",
    operation_id="api.me.integrations.authorize.approve",
    summary="Approve an authorization request",
    description="Grant the client the chosen scope. Returns a redirect URL for the auth-code flow, or null for device.",
    response_model=ItemResponse[MeIntegrationAuthorizeResponse],
    responses=_NOT_FOUND,
)
def approve(
    form: MeIntegrationAuthorizeApproveForm,
    user: CurrentUserDep,
    authorization_request: CurrentMeIntegrationAuthorizationRequestDep,
    manager: MeIntegrationsManagerDep,
) -> ItemResponse[MeIntegrationAuthorizeResponse]:
    result = manager.approve(authorization_request, user=user, scope=form.scope)
    return ItemResponse(item=MeIntegrationAuthorizeResponse(redirect_url=result["redirect_url"]))


@router.post(
    "/authorize/{request_id}/deny",
    operation_id="api.me.integrations.authorize.deny",
    summary="Deny an authorization request",
    description="Refuse the client. Returns a redirect URL (with `error=access_denied`) for the auth-code flow, else null.",
    response_model=ItemResponse[MeIntegrationAuthorizeResponse],
    responses=_NOT_FOUND,
    status_code=status.HTTP_200_OK,
)
def deny(
    user: CurrentUserDep,
    authorization_request: CurrentMeIntegrationAuthorizationRequestDep,
    manager: MeIntegrationsManagerDep,
) -> ItemResponse[MeIntegrationAuthorizeResponse]:
    result = manager.deny(authorization_request, user=user)
    return ItemResponse(item=MeIntegrationAuthorizeResponse(redirect_url=result["redirect_url"]))
