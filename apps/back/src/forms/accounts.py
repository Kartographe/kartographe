# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for accounts (workspaces)."""

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import ComplexityMode, Language


class AccountCreateForm(CamelBase):
    """Create a workspace. The caller becomes its owner."""

    name: str = Field(min_length=1, max_length=255)
    language: Language = Field(default=Language.FRENCH)
    time_zone: str = Field(default="Europe/Paris", max_length=64)


class AccountPatchForm(CamelBase):
    """Partial update of a workspace — only the keys sent are applied."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    language: Language | None = Field(default=None)
    time_zone: str | None = Field(default=None, max_length=64)
    technical_complexity_mode: ComplexityMode | None = Field(
        default=None,
        description="Estimation scale used for technical entities (applications, databases, services).",
    )
    product_complexity_mode: ComplexityMode | None = Field(
        default=None,
        description="Estimation scale used for product entities (features, personas, journeys).",
    )
