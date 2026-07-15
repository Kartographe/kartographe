"""The `oauth_grant` table — an issued user↔client OAuth authorization.

Source of truth for token validation: every OAuth access/refresh JWT carries
`grant.id` + `grant_control`; the middleware reloads this row on each call and
rejects when `status != active` or `grant_control` mismatches (it is rotated on
every refresh, superseding older tokens). Tokens themselves are stateless.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import OauthGrantScope, OauthGrantStatus

if TYPE_CHECKING:
    from src.models.oauth_client import OauthClient
    from src.models.user import User


class OauthGrant(BaseModel, table=True):
    __tablename__ = "oauth_grant"

    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    user: "User" = Relationship()

    client_id: uuid.UUID = Field(foreign_key="oauth_client.id", index=True)
    client: "OauthClient" = Relationship()

    scope: OauthGrantScope = Field(index=True)
    status: OauthGrantStatus = Field(index=True)

    # Rotated on every refresh; embedded in issued tokens to supersede old ones.
    grant_control: str

    revoked_at: datetime | None = Field(default=None)
    last_used_at: datetime | None = Field(default=None)
