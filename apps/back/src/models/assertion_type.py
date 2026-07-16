# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `assertion_type` table — global catalogue of step assertions.

Reference data (not account-scoped), seeded by a data migration. Each row
describes an assertion a scenario step can carry and the shape of its
parameters (`parameter_schema`). The `slug` is unique and prefixed by the type
(e.g. `browser.url`).
"""

from sqlalchemy import JSON
from sqlmodel import Field

from src.models._base import BaseModel
from src.models.enum import AssertionTypeCategory


class AssertionType(BaseModel, table=True):
    __tablename__ = "assertion_type"

    type: AssertionTypeCategory = Field(index=True)
    slug: str = Field(unique=True, index=True)
    label: str
    # Shape hint for a step assertion's `parameters`, e.g. {"url": "string"}.
    parameter_schema: dict = Field(sa_type=JSON)
