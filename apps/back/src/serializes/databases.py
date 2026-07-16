# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for databases, versions, tables, columns and migrations."""

import uuid
from datetime import datetime

from pydantic import Field

from src.models.enum import (
    DatabaseMigrationColumnStatus,
    DatabaseMigrationColumnType,
    DatabaseMigrationStatus,
    DatabaseMigrationType,
    DatabaseStatus,
    DatabaseTableStatus,
    DatabaseTableType,
    DatabaseType,
    DatabaseVersionStatus,
)
from src.serializes._base import CamelBase
from src.serializes.tags import TagItem


class DatabaseItem(CamelBase):
    """A database tracked inside an account."""

    date: datetime
    description: dict | None = None
    id: uuid.UUID
    owner_id: uuid.UUID
    status: DatabaseStatus
    status_date: datetime
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    title: str
    type: DatabaseType


class DatabaseVersionItem(CamelBase):
    """A version of a database's schema (semantic version as an int tuple)."""

    date: datetime
    end_date: datetime | None = None
    id: uuid.UUID
    start_date: datetime | None = None
    status: DatabaseVersionStatus
    version: list[int]


class DatabaseTableColumnItem(CamelBase):
    """A column of a database table."""

    color: str | None = None
    database_column_type_id: uuid.UUID
    date: datetime
    default_value: str
    description: dict | None = None
    foreign_key_database_table_column_id: uuid.UUID | None = None
    foreign_key_database_table_id: uuid.UUID | None = None
    id: uuid.UUID
    name: str
    nullable: bool
    owner_id: uuid.UUID
    rank: int
    system_field: bool
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    unique: bool


class DatabaseTableItem(CamelBase):
    """A table within a database version.

    `columns` is resolved by the manager on every table read (listing included)
    and on create/update.
    """

    color: str | None = None
    columns: list[DatabaseTableColumnItem] | None = None
    date: datetime
    description: dict | None = None
    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    status: DatabaseTableStatus
    status_date: datetime
    table_schema: str = Field(serialization_alias="schema")
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    type: DatabaseTableType


class DatabaseMigrationItem(CamelBase):
    """A planned move from a version of one database to a version of another."""

    date: datetime
    description: dict | None = None
    destination_database_id: uuid.UUID
    destination_database_version_id: uuid.UUID
    id: uuid.UUID
    source_database_id: uuid.UUID
    source_database_version_id: uuid.UUID
    status: DatabaseMigrationStatus
    status_date: datetime
    title: str
    type: DatabaseMigrationType


class DatabaseMigrationColumnItem(CamelBase):
    """One column-level step of a migration.

    A creation only carries destination endpoints, a deletion only source ones,
    and a migration carries both.
    """

    date: datetime
    description: dict | None = None
    destination_database_table_column_id: uuid.UUID | None = None
    destination_database_table_id: uuid.UUID | None = None
    id: uuid.UUID
    owner_id: uuid.UUID
    source_database_table_column_id: uuid.UUID | None = None
    source_database_table_id: uuid.UUID | None = None
    status: DatabaseMigrationColumnStatus
    status_date: datetime
    transformation_method: str | None = None
    type: DatabaseMigrationColumnType
