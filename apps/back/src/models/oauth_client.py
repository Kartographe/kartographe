"""The `oauth_client` table — a dynamically registered OAuth client (integration).

The row's UUID primary key **is** the OAuth `client_id`. `client_secret_hash`
is the argon2 hash of the secret (NULL for public / PKCE-only clients). Redirect
URIs and grant/response types are Postgres arrays for exact matching.
"""

from datetime import datetime

from sqlalchemy import ARRAY, String
from sqlmodel import Field

from src.models._base import BaseModel


class OauthClient(BaseModel, table=True):
    __tablename__ = "oauth_client"

    name: str = Field(description="Human-readable client name shown on the consent screen.")

    client_secret_hash: str | None = Field(default=None)
    client_secret_expires_at: datetime | None = Field(default=None)

    redirect_uris: list[str] = Field(default_factory=list, sa_type=ARRAY(String))
    grant_types: list[str] = Field(default_factory=list, sa_type=ARRAY(String))
    response_types: list[str] = Field(default_factory=list, sa_type=ARRAY(String))

    token_endpoint_auth_method: str = Field(default="none", max_length=32)

    software_id: str | None = Field(default=None)
    software_version: str | None = Field(default=None)
