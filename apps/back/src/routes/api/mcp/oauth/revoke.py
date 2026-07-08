from typing import Annotated

from fastapi import APIRouter, Form, Response

from src.managers.mcp_oauth import MCPOAuthError
from src.utils.dependencies import MCPOAuthManagerDep

router = APIRouter()


@router.post(
    "/revoke",
    operation_id="api.mcp.oauth.revoke",
    summary="Revoke a token",
    description="Revoke an access or refresh token (RFC 7009). Always returns 200, even for unknown tokens.",
    status_code=200,
)
def revoke(
    manager: MCPOAuthManagerDep,
    token: Annotated[str, Form()],
    client_id: Annotated[str, Form()],
    token_type_hint: Annotated[str | None, Form()] = None,
    client_secret: Annotated[str | None, Form()] = None,
) -> Response:
    try:
        client = manager.authenticate_client(client_id=client_id, client_secret=client_secret)
        manager.revoke_token(client, token=token, token_type_hint=token_type_hint)
    except MCPOAuthError:
        pass  # RFC 7009: never leak whether the token/client existed.
    return Response(status_code=200)
