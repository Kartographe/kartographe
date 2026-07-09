"""Output schemas for personas (user archetypes)."""

import uuid
from datetime import datetime

from src.models.enum import PersonaStatus, PersonaType
from src.serializes._base import CamelBase


class PersonaItem(CamelBase):
    """A persona tracked inside an account."""

    date: datetime
    description: dict | None = None
    id: uuid.UUID
    status: PersonaStatus
    tag_ids: list[uuid.UUID]
    title: str
    type: PersonaType
