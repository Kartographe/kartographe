"""The `database_table_column` table — a column of a database table.

A column may model a foreign key by pointing at another table
(`foreign_key_database_table_id`) and, optionally, a specific column of it
(`foreign_key_database_table_column_id`).
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel

if TYPE_CHECKING:
    from src.models.database_column_type import DatabaseColumnType
    from src.models.user import User


class DatabaseTableColumn(BaseModel, table=True):
    __tablename__ = "database_table_column"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    database_table_id: uuid.UUID = Field(foreign_key="database_table.id", index=True)
    database_column_type_id: uuid.UUID = Field(foreign_key="database_column_type.id", index=True)
    foreign_key_database_table_id: uuid.UUID | None = Field(
        default=None, foreign_key="database_table.id", index=True
    )
    foreign_key_database_table_column_id: uuid.UUID | None = Field(
        default=None, foreign_key="database_table_column.id", index=True
    )
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    nullable: bool = Field(default=False)
    unique: bool = Field(default=False)
    default_value: str
    name: str = Field(index=True)
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)

    column_type: "DatabaseColumnType" = Relationship()
    owner: "User" = Relationship()
