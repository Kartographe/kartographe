"""OAuth discovery documents (RFC 8414 / RFC 9728), root-mounted and public."""

from fastapi import APIRouter, Request

from src.serializes.mcp_oauth import MCPMetadataDocument
from src.settings import get_settings

router = APIRouter(tags=["api.mcp.metadata"])


def _base_url(request: Request) -> str:
    """Public base URL, honoring reverse-proxy forwarded headers."""
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.url.netloc)
    return f"{proto}://{host}"


@router.get(
    "/.well-known/oauth-authorization-server",
    operation_id="api.mcp.metadata.authorizationServer",
    summary="OAuth authorization server metadata",
    description="RFC 8414 discovery document describing the MCP OAuth endpoints and capabilities.",
    response_model=MCPMetadataDocument,
)
def authorization_server(request: Request) -> MCPMetadataDocument:
    base = _base_url(request)
    return {
        "issuer": base,
        "authorization_endpoint": f"{base}/mcp/oauth/authorize",
        "token_endpoint": f"{base}/mcp/oauth/token",
        "registration_endpoint": f"{base}/mcp/oauth/register",
        "revocation_endpoint": f"{base}/mcp/oauth/revoke",
        "device_authorization_endpoint": f"{base}/mcp/oauth/device/authorize",
        "scopes_supported": ["read", "write"],
        "response_types_supported": ["code"],
        "grant_types_supported": [
            "authorization_code",
            "refresh_token",
            "urn:ietf:params:oauth:grant-type:device_code",
        ],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none", "client_secret_post"],
    }


def protected_resource(request: Request) -> MCPMetadataDocument:
    base = _base_url(request)
    return {
        "resource": f"{base}{get_settings().mcp_mount_path}",
        "authorization_servers": [base],
        "scopes_supported": ["read", "write"],
        "bearer_methods_supported": ["header"],
    }


router.add_api_route(
    "/.well-known/oauth-protected-resource",
    protected_resource,
    methods=["GET"],
    operation_id="api.mcp.metadata.protectedResource",
    summary="OAuth protected resource metadata",
    response_model=MCPMetadataDocument,
    tags=["api.mcp.metadata"],
)

# RFC 9728 §3.1 path-suffix variant, e.g. /.well-known/oauth-protected-resource/mcp
router.add_api_route(
    f"/.well-known/oauth-protected-resource{get_settings().mcp_mount_path}",
    protected_resource,
    methods=["GET"],
    include_in_schema=False,
)
