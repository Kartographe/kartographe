"""Output schemas for personas (user archetypes)."""

import uuid
from datetime import datetime

from src.models.enum import PersonaStatus, PersonaType
from src.serializes._base import CamelBase
from src.serializes.tags import TagItem


class PersonaItem(CamelBase):
    """A persona tracked inside an account."""

    date: datetime
    description: dict | None = None
    id: uuid.UUID
    status: PersonaStatus
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    title: str
    type: PersonaType
