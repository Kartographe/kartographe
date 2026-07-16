# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for the current-user profile (`/me`)."""

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import Language, UserGender, UserTheme


class MePatchForm(CamelBase):
    """Partial update of the signed-in user's profile.

    Every field is optional; only the keys actually sent are applied.
    """

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    gender: UserGender | None = Field(default=None)
    language: Language | None = Field(default=None)
    theme: UserTheme | None = Field(default=None)
    phone: str | None = Field(default=None, max_length=32)
