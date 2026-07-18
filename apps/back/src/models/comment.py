# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `comment` table — a threaded comment on an account entity.

Polymorphic: a comment targets an entity by (`entity_type`, `entity_id`) rather
than a foreign key. Replies point at their parent via `parent_comment_id`. A
removed comment keeps its row for the thread but drops its `value`.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, ClassVar

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models._search import Searchable
from src.models.enum import EntityType, CommentStatus, SearchEntityType
from src.utils.tiptap import tiptap_to_text

if TYPE_CHECKING:
    from src.models.user import User


class Comment(BaseModel, Searchable, table=True):
    __tablename__ = "comment"

    SEARCH_ENTITY_TYPE: ClassVar[SearchEntityType] = SearchEntityType.COMMENT

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    parent_comment_id: uuid.UUID | None = Field(
        default=None, foreign_key="comment.id", index=True
    )

    date: datetime
    status: CommentStatus = Field(index=True)
    status_date: datetime
    entity_type: EntityType = Field(index=True)
    entity_id: uuid.UUID = Field(index=True)
    # Rich-text (Tiptap JSON document); cleared when the comment is removed.
    value: dict | None = Field(default=None, sa_type=JSON)

    owner: "User" = Relationship(sa_relationship_kwargs={"lazy": "selectin"})

    def search_vector(self) -> dict[str, list[str | None]]:
        # A removed comment clears its `value`, yielding an empty vector, which
        # the indexer turns into a delete — removed comments leave the index.
        return {"A": [tiptap_to_text(self.value)]}
