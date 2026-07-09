"""The `persona` table — a user archetype tracked inside an account."""

import uuid
from datetime import datetime

from sqlalchemy import ARRAY, JSON, Uuid
from sqlmodel import Field

from src.models._base import BaseModel
from src.models.enum import PersonaStatus, PersonaType


class Persona(BaseModel, table=True):
    __tablename__ = "persona"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)

    type: PersonaType = Field(index=True)
    status: PersonaStatus = Field(index=True)
    date: datetime
    title: str
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
    tag_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))
