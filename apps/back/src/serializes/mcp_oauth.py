"""Output schemas for the MCP OAuth endpoints (snake_case wire shape)."""

from typing import Any

from pydantic import BaseModel


class MCPDynamicClientRegistrationResponse(BaseModel):
    client_id: str
    client_secret: str | None = None
    client_id_issued_at: int
    client_secret_expires_at: int | None = None
    client_name: str
    redirect_uris: list[str]
    grant_types: list[str]
    response_types: list[str]
    token_endpoint_auth_method: str


class MCPTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    scope: str


class MCPDeviceAuthorizationResponse(BaseModel):
    device_code: str
    user_code: str
    verification_uri: str
    verification_uri_complete: str
    expires_in: int
    interval: int


# Discovery documents are free-form OAuth metadata objects.
MCPMetadataDocument = dict[str, Any]
