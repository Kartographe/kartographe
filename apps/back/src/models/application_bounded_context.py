# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `application_bounded_context` table — a bounded context of an application.

Draws a boundary inside an application: a named area of the domain, holding the
components that belong to it. The components are referenced by a UUID array
rather than a join table — the same shape `tag_ids` uses — since a context owns
its list and nothing hangs off the pairing itself.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, ClassVar

from sqlalchemy import ARRAY, JSON, Uuid
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models._lockable import LockableMixin
from src.models._search import Searchable
from src.models.enum import SearchEntityType
from src.utils.tiptap import tiptap_to_text

if TYPE_CHECKING:
    from src.models.user import User


class ApplicationBoundedContext(LockableMixin, BaseModel, Searchable, table=True):
    __tablename__ = "application_bounded_context"

    SEARCH_ENTITY_TYPE: ClassVar[SearchEntityType] = SearchEntityType.APPLICATION_BOUNDED_CONTEXT

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    application_id: uuid.UUID = Field(foreign_key="application.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    # Components inside the boundary — validated against the application.
    application_component_ids: list[uuid.UUID] = Field(
        default_factory=list, sa_type=ARRAY(Uuid)
    )

    date: datetime
    title: str = Field(index=True)
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)

    # Two FKs point at `user.id` (owner + locker), so each relationship must name
    # its own — SQLAlchemy can't infer which column feeds which.
    owner: "User" = Relationship(
        sa_relationship_kwargs={
            "lazy": "selectin",
            "foreign_keys": "[ApplicationBoundedContext.owner_id]",
        }
    )
    locked_by: "User" = Relationship(
        sa_relationship_kwargs={
            "lazy": "selectin",
            "foreign_keys": "[ApplicationBoundedContext.locked_by_id]",
        }
    )

    def search_vector(self) -> dict[str, list[str | None]]:
        return {"A": [self.title], "B": [tiptap_to_text(self.description)]}
