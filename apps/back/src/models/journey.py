"""The `journey` table — a user journey (parcours) tracked inside an account."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, JSON, Uuid
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import JourneyStatus, JourneyType

if TYPE_CHECKING:
    from src.models.user import User


class Journey(BaseModel, table=True):
    __tablename__ = "journey"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    type: JourneyType = Field(index=True)
    # Personas this journey targets — validated against the account on write.
    personas_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))
    status: JourneyStatus = Field(index=True)
    status_date: datetime
    title: str
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)

    owner: "User" = Relationship()
