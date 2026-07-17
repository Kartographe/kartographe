# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `database_migration_column` table — one column-level step of a migration.

The step's `type` says how to read the two sides: a `creation` only lands on the
destination, a `deletion` only leaves the source, and a `migration` carries data
across — optionally reshaped by `transformation_method`. All four endpoints are
nullable so each type only fills the sides it uses.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import DatabaseMigrationColumnStatus, DatabaseMigrationColumnType

if TYPE_CHECKING:
    from src.models.user import User


class DatabaseMigrationColumn(BaseModel, table=True):
    __tablename__ = "database_migration_column"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    database_migration_id: uuid.UUID = Field(foreign_key="database_migration.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    source_database_table_id: uuid.UUID | None = Field(
        default=None, foreign_key="database_table.id", index=True
    )
    source_database_table_column_id: uuid.UUID | None = Field(
        default=None, foreign_key="database_table_column.id", index=True
    )
    destination_database_table_id: uuid.UUID | None = Field(
        default=None, foreign_key="database_table.id", index=True
    )
    destination_database_table_column_id: uuid.UUID | None = Field(
        default=None, foreign_key="database_table_column.id", index=True
    )

    date: datetime
    type: DatabaseMigrationColumnType
    status: DatabaseMigrationColumnStatus = Field(index=True)
    status_date: datetime
    # Free-form recipe applied to the value on its way across (SQL, expression, …).
    transformation_method: str | None = Field(default=None)
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)

    owner: "User" = Relationship(sa_relationship_kwargs={"lazy": "selectin"})
