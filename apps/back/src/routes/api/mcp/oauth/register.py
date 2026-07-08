from datetime import UTC, datetime

from fastapi import APIRouter, status

from src.forms.mcp_oauth import MCPDynamicClientRegistrationForm
from src.serializes.mcp_oauth import MCPDynamicClientRegistrationResponse
from src.utils.dependencies import MCPOAuthManagerDep

router = APIRouter()


@router.post(
    "/register",
    operation_id="api.mcp.oauth.register",
    summary="Register an MCP OAuth client",
    description="Dynamic client registration (RFC 7591). Returns the client id (and secret for confidential clients).",
    response_model=MCPDynamicClientRegistrationResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
def register(
    form: MCPDynamicClientRegistrationForm, manager: MCPOAuthManagerDep
) -> MCPDynamicClientRegistrationResponse:
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
    return MCPDynamicClientRegistrationResponse(
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
