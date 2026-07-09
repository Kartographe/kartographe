"""Output schemas for databases, versions, tables and columns."""

import uuid
from datetime import datetime

from pydantic import Field

from src.models.enum import DatabaseStatus, DatabaseTableStatus, DatabaseTableType, DatabaseType, DatabaseVersionStatus
from src.serializes._base import CamelBase


class DatabaseItem(CamelBase):
    """A database tracked inside an account."""

    date: datetime
    description: dict | None = None
    id: uuid.UUID
    owner_id: uuid.UUID
    status: DatabaseStatus
    status_date: datetime
    tag_ids: list[uuid.UUID]
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
    unique: bool


class DatabaseTableItem(CamelBase):
    """A table within a database version.

    `columns` is resolved by the manager on the single-table read and on
    create; the listing omits it.
    """

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
    type: DatabaseTableType
