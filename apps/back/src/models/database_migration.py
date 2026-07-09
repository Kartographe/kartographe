"""The `database_migration` table — a planned move between two database versions.

A migration always leaves from a version of its source database and lands on a
version of its destination database (the two databases may be the same). Its
column-level plan lives in `database_migration_column`.
"""

import uuid
from datetime import datetime

from sqlalchemy import JSON
from sqlmodel import Field

from src.models._base import BaseModel
from src.models.enum import DatabaseMigrationStatus, DatabaseMigrationType


class DatabaseMigration(BaseModel, table=True):
    __tablename__ = "database_migration"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    source_database_id: uuid.UUID = Field(foreign_key="database.id", index=True)
    source_database_version_id: uuid.UUID = Field(foreign_key="database_version.id", index=True)
    destination_database_id: uuid.UUID = Field(foreign_key="database.id", index=True)
    destination_database_version_id: uuid.UUID = Field(
        foreign_key="database_version.id", index=True
    )

    date: datetime
    type: DatabaseMigrationType
    status: DatabaseMigrationStatus = Field(index=True)
    status_date: datetime
    title: str = Field(index=True)
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
