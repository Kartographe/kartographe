# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `database_table` table — a table within a database version."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, ClassVar

from sqlalchemy import ARRAY, JSON, Column, Uuid
from sqlmodel import AutoString, Field, Relationship

from src.models._base import BaseModel
from src.models._lockable import LockableMixin
from src.models._search import Searchable
from src.models.enum import DatabaseTableStatus, DatabaseTableType, SearchEntityType
from src.utils.tiptap import tiptap_to_text

if TYPE_CHECKING:
    from src.models.user import User


class DatabaseTable(LockableMixin, BaseModel, Searchable, table=True):
    __tablename__ = "database_table"

    SEARCH_ENTITY_TYPE: ClassVar[SearchEntityType] = SearchEntityType.DATABASE_TABLE

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
    # Display color as a `#rgb`/`#rrggbb` hex string; unset means "no color".
    color: str | None = Field(default=None)
    tag_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))

    # Two FKs point at `user.id` (owner + locker), so each relationship must name
    # its own — SQLAlchemy can't infer which column feeds which.
    owner: "User" = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "foreign_keys": "[DatabaseTable.owner_id]"}
    )
    locked_by: "User" = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "foreign_keys": "[DatabaseTable.locked_by_id]"}
    )

    def search_vector(self) -> dict[str, list[str | None]]:
        return {
            "A": [self.name],
            "B": [tiptap_to_text(self.description)],
            "C": [self.table_schema],
        }
