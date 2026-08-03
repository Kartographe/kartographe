# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `application_component` table — a building block of an application.

Where a route describes what an application *exposes*, a component describes
what it is *made of*: its front, its back, a shared library, an async worker, a
third-party integration. Like the other first-class entities it is taggable,
commentable, votable, estimable and lockable.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, ClassVar

from sqlalchemy import ARRAY, JSON, Uuid
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models._lockable import LockableMixin
from src.models._search import Searchable
from src.models.enum import (
    ApplicationComponentStatus,
    ApplicationComponentType,
    SearchEntityType,
)
from src.utils.tiptap import tiptap_to_text

if TYPE_CHECKING:
    from src.models.user import User


class ApplicationComponent(LockableMixin, BaseModel, Searchable, table=True):
    __tablename__ = "application_component"

    SEARCH_ENTITY_TYPE: ClassVar[SearchEntityType] = SearchEntityType.APPLICATION_COMPONENT

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    application_id: uuid.UUID = Field(foreign_key="application.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    tag_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))

    date: datetime
    status: ApplicationComponentStatus = Field(index=True)
    status_date: datetime
    type: ApplicationComponentType = Field(index=True)
    title: str = Field(index=True)
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)

    # Two FKs point at `user.id` (owner + locker), so each relationship must name
    # its own — SQLAlchemy can't infer which column feeds which.
    owner: "User" = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "foreign_keys": "[ApplicationComponent.owner_id]"}
    )
    locked_by: "User" = Relationship(
        sa_relationship_kwargs={
            "lazy": "selectin",
            "foreign_keys": "[ApplicationComponent.locked_by_id]",
        }
    )

    def search_vector(self) -> dict[str, list[str | None]]:
        return {"A": [self.title], "B": [tiptap_to_text(self.description)]}
