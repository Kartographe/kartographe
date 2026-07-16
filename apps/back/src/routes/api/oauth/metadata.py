# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""OAuth discovery documents (RFC 8414 / RFC 9728), root-mounted and public."""

from fastapi import APIRouter, Request

from src.serializes.oauth import OauthMetadataDocument
from src.settings import get_settings

router = APIRouter(tags=["api.oauth.metadata"])


def _base_url(request: Request) -> str:
    """Public base URL, honoring reverse-proxy forwarded headers."""
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.url.netloc)
    return f"{proto}://{host}"


@router.get(
    "/.well-known/oauth-authorization-server",
    operation_id="api.oauth.metadata.authorizationServer",
    summary="OAuth authorization server metadata",
    description="RFC 8414 discovery document describing the OAuth endpoints and capabilities.",
    response_model=OauthMetadataDocument,
)
def authorization_server(request: Request) -> OauthMetadataDocument:
    base = _base_url(request)
    return {
        "issuer": base,
        "authorization_endpoint": f"{base}/oauth/authorize",
        "token_endpoint": f"{base}/oauth/token",
        "registration_endpoint": f"{base}/oauth/register",
        "revocation_endpoint": f"{base}/oauth/revoke",
        "device_authorization_endpoint": f"{base}/oauth/device/authorize",
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


def protected_resource(request: Request) -> OauthMetadataDocument:
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
    operation_id="api.oauth.metadata.protectedResource",
    summary="OAuth protected resource metadata",
    response_model=OauthMetadataDocument,
    tags=["api.oauth.metadata"],
)

# RFC 9728 §3.1 path-suffix variant, e.g. /.well-known/oauth-protected-resource/mcp
router.add_api_route(
    f"/.well-known/oauth-protected-resource{get_settings().mcp_mount_path}",
    protected_resource,
    methods=["GET"],
    include_in_schema=False,
)
