"""Input schemas for databases, versions, tables and columns."""

import uuid

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import DatabaseTableType, DatabaseType

# A `#rgb` or `#rrggbb` color. `None` clears the color; the field is optional.
HEX_COLOR_PATTERN = r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"

# --- Database ------------------------------------------------------------


class DatabaseCreateForm(CamelBase):
    """Create a database. It starts as a draft owned by the caller."""

    type: DatabaseType
    title: str = Field(min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    tag_ids: list[uuid.UUID] = Field(default_factory=list)


class DatabasePatchForm(CamelBase):
    """Partial update of a database — only the keys sent are applied."""

    type: DatabaseType | None = Field(default=None)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    tag_ids: list[uuid.UUID] | None = Field(default=None)


# --- DatabaseVersion -----------------------------------------------------


class DatabaseVersionCreateForm(CamelBase):
    """Create a database version. It starts as a draft."""

    version: list[int] = Field(min_length=1, max_length=4, description="Version tuple, e.g. [1, 2, 3].")


class DatabaseVersionPatchForm(CamelBase):
    """Partial update of a version — only the keys sent are applied."""

    version: list[int] | None = Field(default=None, min_length=1, max_length=4)


# --- DatabaseTableColumn -------------------------------------------------


class DatabaseTableColumnCreateForm(CamelBase):
    """Create a column (standalone, or nested in a table create/update)."""

    database_column_type_id: uuid.UUID
    foreign_key_database_table_id: uuid.UUID | None = Field(default=None)
    foreign_key_database_table_column_id: uuid.UUID | None = Field(default=None)
    nullable: bool = Field(default=False)
    unique: bool = Field(default=False)
    system_field: bool = Field(default=False)
    rank: int = Field(default=0, ge=0)
    default_value: str = Field(default="", max_length=1024)
    name: str = Field(min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    tag_ids: list[uuid.UUID] = Field(default_factory=list)


class DatabaseTableColumnPatchForm(CamelBase):
    """Partial update of a column — only the keys sent are applied."""

    database_column_type_id: uuid.UUID | None = Field(default=None)
    foreign_key_database_table_id: uuid.UUID | None = Field(default=None)
    foreign_key_database_table_column_id: uuid.UUID | None = Field(default=None)
    nullable: bool | None = Field(default=None)
    unique: bool | None = Field(default=None)
    system_field: bool | None = Field(default=None)
    rank: int | None = Field(default=None, ge=0)
    default_value: str | None = Field(default=None, max_length=1024)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    tag_ids: list[uuid.UUID] | None = Field(default=None)


# --- DatabaseTable -------------------------------------------------------


class DatabaseTableCreateForm(CamelBase):
    """Create a table, optionally with its columns in one call."""

    type: DatabaseTableType
    table_schema: str = Field(alias="schema", min_length=1, max_length=255)
    name: str = Field(min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    columns: list[DatabaseTableColumnCreateForm] = Field(default_factory=list)
    tag_ids: list[uuid.UUID] = Field(default_factory=list)


class DatabaseTablePatchForm(CamelBase):
    """Partial update of a table. If `columns` is sent, it fully replaces the
    table's current columns."""

    type: DatabaseTableType | None = Field(default=None)
    table_schema: str | None = Field(default=None, alias="schema", min_length=1, max_length=255)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    columns: list[DatabaseTableColumnCreateForm] | None = Field(default=None)
    tag_ids: list[uuid.UUID] | None = Field(default=None)
