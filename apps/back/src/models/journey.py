# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `journey` table — a user journey (parcours) tracked inside an account."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, JSON, Uuid
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models._lockable import LockableMixin
from src.models.enum import JourneyStatus, JourneyType

if TYPE_CHECKING:
    from src.models.user import User


class Journey(LockableMixin, BaseModel, table=True):
    __tablename__ = "journey"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    type: JourneyType = Field(index=True)
    # Personas this journey targets — validated against the account on write.
    personas_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))
    status: JourneyStatus = Field(index=True)
    status_date: datetime
    title: str
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
    tag_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))

    # Two FKs point at `user.id` (owner + locker), so each relationship must name
    # its own — SQLAlchemy can't infer which column feeds which.
    owner: "User" = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "foreign_keys": "[Journey.owner_id]"}
    )
    locked_by: "User" = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "foreign_keys": "[Journey.locked_by_id]"}
    )
