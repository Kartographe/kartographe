# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `link` table — an external reference attached to an account entity.

Polymorphic like `comment` and `complexity`: the reference targets an entity by
(`entity_type`, `entity_id`) rather than a foreign key. A link carries the URL
it points at, its kind, and an optional title and rich-text description. When
the URL points back at this very instance, the serializer resolves it into a
structured pointer — the row itself stores nothing but the URL.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import EntityType, LinkType

if TYPE_CHECKING:
    from src.models.user import User


class Link(BaseModel, table=True):
    __tablename__ = "link"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    entity_type: EntityType = Field(index=True)
    entity_id: uuid.UUID = Field(index=True)
    type: LinkType = Field(index=True)
    # Free-form label; prefilled from the target page's title on creation.
    title: str | None = Field(default=None, max_length=500)
    # Rich-text (Tiptap JSON document) explaining why the reference is here.
    description: dict | None = Field(default=None, sa_type=JSON)
    url: str = Field(max_length=2048)

    owner: "User" = Relationship(sa_relationship_kwargs={"lazy": "selectin"})
