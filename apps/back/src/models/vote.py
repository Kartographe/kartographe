# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `vote` table — a member's stance on an account entity.

Polymorphic, like `comment`: a vote targets an entity by (`entity_type`,
`entity_id`) rather than a foreign key, over the shared `EntityType` list. Each
member holds at most one active vote per entity — a re-vote updates the existing
row rather than adding another (a partial unique index enforces it). The `role`
is snapshotted from the member's `vote_role` when the vote is cast.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Index, text
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import EntityType, VoteRole, VoteValue

if TYPE_CHECKING:
    from src.models.user import User


class Vote(BaseModel, table=True):
    __tablename__ = "vote"
    __table_args__ = (
        # At most one live vote per member and entity. Partial index on the
        # soft-delete flag so a disabled vote never blocks a fresh one.
        Index(
            "unique_vote_active",
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
    role: VoteRole
    value: VoteValue = Field(index=True)

    owner: "User" = Relationship(sa_relationship_kwargs={"lazy": "selectin"})
