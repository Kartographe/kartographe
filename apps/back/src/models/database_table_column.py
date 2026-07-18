# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `database_table_column` table — a column of a database table.

A column may model a foreign key by pointing at another table
(`foreign_key_database_table_id`) and, optionally, a specific column of it
(`foreign_key_database_table_column_id`).
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, ClassVar

from sqlalchemy import ARRAY, JSON, Uuid
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models._lockable import LockableMixin
from src.models._search import Searchable
from src.models.enum import SearchEntityType
from src.utils.tiptap import tiptap_to_text

if TYPE_CHECKING:
    from src.models.database_column_type import DatabaseColumnType
    from src.models.user import User


class DatabaseTableColumn(LockableMixin, BaseModel, Searchable, table=True):
    __tablename__ = "database_table_column"

    SEARCH_ENTITY_TYPE: ClassVar[SearchEntityType] = SearchEntityType.DATABASE_TABLE_COLUMN

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
    # Whether the column is a framework/system field (e.g. id, timestamps).
    system_field: bool = Field(default=False)
    # Display/sort order of the column within its table.
    rank: int = Field(default=0, index=True)
    default_value: str
    name: str = Field(index=True)
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
    # Display color as a `#rgb`/`#rrggbb` hex string; unset means "no color".
    color: str | None = Field(default=None)
    tag_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))

    column_type: "DatabaseColumnType" = Relationship()
    # Two FKs point at `user.id` (owner + locker), so each relationship must name
    # its own — SQLAlchemy can't infer which column feeds which.
    owner: "User" = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "foreign_keys": "[DatabaseTableColumn.owner_id]"}
    )
    locked_by: "User" = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "foreign_keys": "[DatabaseTableColumn.locked_by_id]"}
    )

    def search_vector(self) -> dict[str, list[str | None]]:
        return {"A": [self.name], "B": [tiptap_to_text(self.description)]}
