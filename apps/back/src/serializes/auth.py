"""Output schemas for the `/auth/*` surface."""

from typing import Any

from pydantic import Field

from src.models.enum import UserAuthenticationTwoFactorType
from src.serializes._base import CamelBase, ItemResponse


class TokenItem(CamelBase):
    """A bearer token pair. `refreshToken` is absent for intermediate tokens."""

    access_token: str = Field(description="Bearer token to send as `Authorization: Bearer <token>`.")
    expires_in: int = Field(description="Access-token lifetime in seconds.", examples=[3600])
    refresh_token: str | None = Field(default=None, description="Token used to obtain a new access token.")
    refresh_token_expires_in: int | None = Field(default=None, description="Refresh-token lifetime in seconds.")
    token_type: str = Field(default="Bearer", description="Always `Bearer`.")


# `{ "item": TokenItem }` — used by the refresh and second-factor endpoints.
TokenResponse = ItemResponse[TokenItem]


class AuthResponse(CamelBase):
    """Login / SSO result.

    When `twoFactorEnabled` is false, `item` carries the full access + refresh
    pair and the login is complete. When true, `item` carries a short-lived
    intermediate token to replay against one of `twoFactorAvailableTypes`.
    """

    item: TokenItem
    two_factor_available_types: list[UserAuthenticationTwoFactorType] = Field(
        default_factory=list,
        description="Second factors to choose from when 2FA is required.",
    )
    two_factor_enabled: bool = Field(default=False, description="Whether a second factor is still required.")


class U2FAssertionOptionsItem(CamelBase):
    """WebAuthn assertion options plus the token tying them to this login."""

    assertion_token: str = Field(description="Token to send back with the browser's assertion.")
    options: dict[str, Any] = Field(description="`PublicKeyCredentialRequestOptions` for `navigator.credentials.get`.")
