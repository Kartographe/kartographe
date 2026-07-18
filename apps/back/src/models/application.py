# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `application` table — an application tracked inside an account."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, ClassVar

from sqlalchemy import ARRAY, Uuid
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models._lockable import LockableMixin
from src.models._search import Searchable
from src.models.enum import ApplicationStatus, ApplicationType, SearchEntityType

if TYPE_CHECKING:
    from src.models.user import User


class Application(LockableMixin, BaseModel, Searchable, table=True):
    __tablename__ = "application"

    SEARCH_ENTITY_TYPE: ClassVar[SearchEntityType] = SearchEntityType.APPLICATION

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    title: str
    description: str | None = Field(default=None)
    type: ApplicationType = Field(index=True)
    status: ApplicationStatus = Field(index=True)
    status_date: datetime
    tag_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))

    # Two FKs point at `user.id` (owner + locker), so each relationship must name
    # its own — SQLAlchemy can't infer which column feeds which.
    owner: "User" = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "foreign_keys": "[Application.owner_id]"}
    )
    locked_by: "User" = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "foreign_keys": "[Application.locked_by_id]"}
    )

    def search_vector(self) -> dict[str, list[str | None]]:
        # `description` here is plain text, not a Tiptap document.
        return {"A": [self.title], "B": [self.description]}
