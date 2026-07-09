"""The `feature` table — a feature tracked at the account level."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, JSON, Uuid
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import FeatureStatus, FeatureType

if TYPE_CHECKING:
    from src.models.user import User


class Feature(BaseModel, table=True):
    __tablename__ = "feature"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    title: str
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
    type: FeatureType = Field(index=True)
    status: FeatureStatus = Field(index=True)
    status_date: datetime
    tag_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))

    owner: "User" = Relationship()
