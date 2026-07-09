"""The `database_table` table — a table within a database version."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, JSON, Column, Uuid
from sqlmodel import AutoString, Field, Relationship

from src.models._base import BaseModel
from src.models.enum import DatabaseTableStatus, DatabaseTableType

if TYPE_CHECKING:
    from src.models.user import User


class DatabaseTable(BaseModel, table=True):
    __tablename__ = "database_table"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    database_id: uuid.UUID = Field(foreign_key="database.id", index=True)
    database_version_id: uuid.UUID = Field(foreign_key="database_version.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    type: DatabaseTableType = Field(index=True)
    date: datetime
    status: DatabaseTableStatus = Field(index=True)
    status_date: datetime
    # Python attribute renamed off `schema` (which shadows a Pydantic method);
    # the DB column and the API field stay `schema`.
    table_schema: str = Field(sa_column=Column("schema", AutoString(), nullable=False))
    name: str = Field(index=True)
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
    tag_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))

    owner: "User" = Relationship()
