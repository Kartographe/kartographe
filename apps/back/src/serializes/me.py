# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schema for the current-user profile (`/me`)."""

import uuid
from datetime import datetime

from pydantic import Field

from src.models.enum import Language, UserGender, UserTheme
from src.serializes._base import CamelBase


class MeItem(CamelBase):
    """The signed-in user's own profile."""

    email: str
    first_name: str | None = None
    gender: UserGender
    id: uuid.UUID
    language: Language
    last_name: str | None = None
    phone: str | None = None
    picture_profile: str | None = None
    registered_at: datetime | None = Field(default=None, description="When the account was created.")
    theme: UserTheme
    two_factor_enabled: bool = Field(default=False, description="Whether at least one second factor is active.")
