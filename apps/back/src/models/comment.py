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
from typing import TYPE_CHECKING

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import CommentEntityType, CommentStatus

if TYPE_CHECKING:
    from src.models.user import User


class Comment(BaseModel, table=True):
    __tablename__ = "comment"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    parent_comment_id: uuid.UUID | None = Field(
        default=None, foreign_key="comment.id", index=True
    )

    date: datetime
    status: CommentStatus = Field(index=True)
    status_date: datetime
    entity_type: CommentEntityType = Field(index=True)
    entity_id: uuid.UUID = Field(index=True)
    # Rich-text (Tiptap JSON document); cleared when the comment is removed.
    value: dict | None = Field(default=None, sa_type=JSON)

    owner: "User" = Relationship(sa_relationship_kwargs={"lazy": "selectin"})
