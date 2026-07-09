"""The `database` table — a database tracked inside an account."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, JSON, Uuid
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import DatabaseStatus, DatabaseType

if TYPE_CHECKING:
    from src.models.user import User


class Database(BaseModel, table=True):
    __tablename__ = "database"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    type: DatabaseType = Field(index=True)
    status: DatabaseStatus = Field(index=True)
    status_date: datetime
    title: str
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
    tag_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))

    owner: "User" = Relationship()
