"""Output schema for comments."""

import uuid
from datetime import datetime

from src.models.enum import CommentEntityType, CommentStatus
from src.serializes._base import CamelBase


class CommentItem(CamelBase):
    """A threaded comment on an account entity."""

    date: datetime
    entity_id: uuid.UUID
    entity_type: CommentEntityType
    id: uuid.UUID
    owner_id: uuid.UUID
    parent_comment_id: uuid.UUID | None = None
    status: CommentStatus
    status_date: datetime
    value: dict | None = None
