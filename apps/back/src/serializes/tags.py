"""Output schema for tags."""

import uuid

from src.models.enum import TagEntityType
from src.serializes._base import CamelBase


class TagItem(CamelBase):
    """A colored label attachable to an account's entities."""

    background_color: str
    entity_type: TagEntityType
    id: uuid.UUID
    label: str
    text_color: str
