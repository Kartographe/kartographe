"""The `oauth_authorization_request` table — a pending OAuth authorization.

One row covers both the device flow and the authorization-code (PKCE) flow via
`flow_type`; the fields not used by the active flow stay NULL. `user_id` is
nullable: a request is anonymous until the signed-in user approves it in the
SPA. Single-use via `consumed_at`.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import (
    OauthAuthorizationFlowType,
    OauthAuthorizationRequestStatus,
    OauthGrantScope,
)

if TYPE_CHECKING:
    from src.models.oauth_client import OauthClient
    from src.models.user import User


class OauthAuthorizationRequest(BaseModel, table=True):
    __tablename__ = "oauth_authorization_request"

    flow_type: OauthAuthorizationFlowType = Field(index=True)
    status: OauthAuthorizationRequestStatus = Field(index=True)

    client_id: uuid.UUID = Field(foreign_key="oauth_client.id", index=True)
    client: "OauthClient" = Relationship()

    requested_scope: OauthGrantScope = Field(index=True)
    approved_scope: OauthGrantScope | None = Field(default=None)

    user_id: uuid.UUID | None = Field(default=None, foreign_key="user.id", index=True)
    user: Optional["User"] = Relationship()

    expires_at: datetime = Field(index=True)
    approved_at: datetime | None = Field(default=None)
    consumed_at: datetime | None = Field(default=None)

    # Device flow — NULL on authorization-code rows.
    device_code: str | None = Field(default=None, unique=True, index=True)
    user_code: str | None = Field(default=None, unique=True, index=True)
    polling_interval_seconds: int | None = Field(default=None)

    # Authorization-code flow — NULL on device rows.
    authorization_code: str | None = Field(default=None, unique=True, index=True)
    redirect_uri: str | None = Field(default=None)
    code_challenge: str | None = Field(default=None)
    code_challenge_method: str | None = Field(default=None, max_length=10)
    state: str | None = Field(default=None)
