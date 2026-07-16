# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schema for OAuth dynamic client registration (RFC 7591).

OAuth uses a snake_case wire shape, so these are plain Pydantic models (no
camelCase alias generator).
"""

from pydantic import BaseModel, Field


class OauthClientRegistrationForm(BaseModel):
    client_name: str = Field(examples=["Claude"])
    redirect_uris: list[str] = Field(default_factory=list)
    grant_types: list[str] | None = None
    response_types: list[str] | None = None
    token_endpoint_auth_method: str = "none"
    software_id: str | None = None
    software_version: str | None = None
