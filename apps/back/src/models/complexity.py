# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `complexity` table — a member's effort estimate on an account entity.

Polymorphic, like `comment` and `vote`: the estimate targets an entity by
(`entity_type`, `entity_id`) over the shared `EntityType` list. Each member
holds at most one live estimate per entity — re-estimating updates the existing
row (a partial unique index enforces it). The `mode` is snapshotted from the
account's scale for that entity's scope (technical or product) when the estimate
is given, so a stored value stays readable after the account switches scale.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Index, text
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import ComplexityMode, EntityType

if TYPE_CHECKING:
    from src.models.user import User


class Complexity(BaseModel, table=True):
    __tablename__ = "complexity"
    __table_args__ = (
        # At most one live estimate per member and entity. Partial index on the
        # soft-delete flag so a disabled row never blocks a fresh one.
        Index(
            "unique_complexity_active",
            "account_id",
            "entity_type",
            "entity_id",
            "owner_id",
            unique=True,
            postgresql_where=text("enabled"),
        ),
    )

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    entity_type: EntityType = Field(index=True)
    entity_id: uuid.UUID = Field(index=True)
    mode: ComplexityMode = Field(index=True)
    # Null is a first-class answer ("cannot estimate yet"), not a missing row.
    # `0.5` on the modified-Fibonacci scale is why this is a decimal.
    value: Decimal | None = Field(default=None, max_digits=6, decimal_places=2, index=True)

    owner: "User" = Relationship(sa_relationship_kwargs={"lazy": "selectin"})
