from typing import Annotated

from fastapi import APIRouter, Form

from src.managers.mcp_oauth import MCPOAuthError
from src.serializes.mcp_oauth import MCPTokenResponse
from src.utils.dependencies import MCPOAuthManagerDep

router = APIRouter()

_DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code"


@router.post(
    "/token",
    operation_id="api.mcp.oauth.token",
    summary="Token endpoint",
    description="Exchange an authorization code, device code or refresh token for an access + refresh token pair.",
    response_model=MCPTokenResponse,
)
def token(
    manager: MCPOAuthManagerDep,
    grant_type: Annotated[str, Form()],
    client_id: Annotated[str, Form()],
    client_secret: Annotated[str | None, Form()] = None,
    code: Annotated[str | None, Form()] = None,
    code_verifier: Annotated[str | None, Form()] = None,
    redirect_uri: Annotated[str | None, Form()] = None,
    device_code: Annotated[str | None, Form()] = None,
    refresh_token: Annotated[str | None, Form()] = None,
) -> MCPTokenResponse:
    client = manager.authenticate_client(client_id=client_id, client_secret=client_secret)
    if grant_type == "authorization_code":
        return manager.exchange_authorization_code(
            client, code=code or "", code_verifier=code_verifier, redirect_uri=redirect_uri
        )
    if grant_type == _DEVICE_GRANT:
        return manager.exchange_device_code(client, device_code=device_code or "")
    if grant_type == "refresh_token":
        return manager.refresh_access_token(refresh_token=refresh_token or "", client=client)
    raise MCPOAuthError("unsupported_grant_type", f"Unsupported grant_type: {grant_type}")
