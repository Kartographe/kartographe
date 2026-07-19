# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for databases, versions, tables, columns and migrations."""

import uuid
from typing import Annotated

from pydantic import Field, model_validator

from src.forms._base import CamelBase
from src.models.enum import (
    DatabaseMigrationColumnType,
    DatabaseMigrationType,
    DatabaseStatus,
    DatabaseTableStatus,
    DatabaseTableType,
    DatabaseType,
    DatabaseVersionStatus,
)

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

    status: DatabaseStatus | None = Field(default=None)
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

    status: DatabaseVersionStatus | None = Field(default=None)
    version: list[int] | None = Field(default=None, min_length=1, max_length=4)


# --- DatabaseTableColumn -------------------------------------------------


class DatabaseTableColumnSubfieldInlineForm(CamelBase):
    """A sub-field of a JSON column, sent inline with its column.

    Used when sub-fields accompany their column (a column create, or a column
    update that replaces them), where the ids do not exist yet. Nesting is
    expressed by `parentIndex` — the 0-based position of the parent within this
    same list — or `null` for a top-level sub-field. A parent must appear before
    its children. (A flat list, rather than a recursive tree, keeps the schema
    non-cyclic so it stays usable as an MCP tool.)
    """

    database_column_type_id: uuid.UUID
    parent_index: int | None = Field(default=None, ge=0)
    name: str = Field(min_length=1, max_length=255)
    nullable: bool = Field(default=False)
    rank: int = Field(default=0, ge=0)
    description: dict | None = Field(default=None)


class DatabaseTableColumnCreateForm(CamelBase):
    """Create a column (standalone, or nested in a table create/update)."""

    database_column_type_id: uuid.UUID
    foreign_key_database_table_id: uuid.UUID | None = Field(default=None)
    foreign_key_database_table_column_id: uuid.UUID | None = Field(default=None)
    nullable: bool = Field(default=False)
    unique: bool = Field(default=False)
    primary_key: bool = Field(default=False)
    system_field: bool = Field(default=False)
    rank: int = Field(default=0, ge=0)
    default_value: str = Field(default="", max_length=1024)
    name: str = Field(min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    tag_ids: list[uuid.UUID] = Field(default_factory=list)
    # JSON sub-fields, created with the column (flat list, nested via parentIndex).
    subfields: list[DatabaseTableColumnSubfieldInlineForm] = Field(default_factory=list)


class DatabaseTableColumnReorderForm(CamelBase):
    """Reorder the columns of a table. Send exactly one of the two shapes.

    `columnIds` is the table's columns in their new order, and must list every
    column of the table exactly once. `ranks` maps a column to its new position
    and may cover only the columns that move.
    """

    column_ids: list[uuid.UUID] | None = Field(
        default=None, description="Every column of the table, in their new order."
    )
    ranks: dict[uuid.UUID, Annotated[int, Field(ge=0)]] | None = Field(
        default=None, description="New position of each column, keyed by column id."
    )

    @model_validator(mode="after")
    def _exactly_one_shape(self) -> "DatabaseTableColumnReorderForm":
        if (self.column_ids is None) == (self.ranks is None):
            raise ValueError("Send either columnIds or ranks, not both.")
        return self


class DatabaseTableColumnPatchForm(CamelBase):
    """Partial update of a column — only the keys sent are applied."""

    database_column_type_id: uuid.UUID | None = Field(default=None)
    foreign_key_database_table_id: uuid.UUID | None = Field(default=None)
    foreign_key_database_table_column_id: uuid.UUID | None = Field(default=None)
    nullable: bool | None = Field(default=None)
    unique: bool | None = Field(default=None)
    primary_key: bool | None = Field(default=None)
    system_field: bool | None = Field(default=None)
    rank: int | None = Field(default=None, ge=0)
    default_value: str | None = Field(default=None, max_length=1024)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    tag_ids: list[uuid.UUID] | None = Field(default=None)
    # When sent, fully replaces the column's sub-fields (send `[]` to clear).
    subfields: list[DatabaseTableColumnSubfieldInlineForm] | None = Field(default=None)


class DatabaseTableColumnSubfieldCreateForm(CamelBase):
    """Create a single sub-field via the dedicated sub-field route.

    `parentSubfieldId` nests it under an existing sub-field of the same column;
    unset means a top-level sub-field.
    """

    database_column_type_id: uuid.UUID
    parent_subfield_id: uuid.UUID | None = Field(default=None)
    name: str = Field(min_length=1, max_length=255)
    nullable: bool = Field(default=False)
    rank: int = Field(default=0, ge=0)
    description: dict | None = Field(default=None)


class DatabaseTableColumnSubfieldPatchForm(CamelBase):
    """Partial update of a sub-field — only the keys sent are applied.

    Send `parentSubfieldId: null` to move a sub-field back to the top level.
    """

    database_column_type_id: uuid.UUID | None = Field(default=None)
    parent_subfield_id: uuid.UUID | None = Field(default=None)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    nullable: bool | None = Field(default=None)
    rank: int | None = Field(default=None, ge=0)
    description: dict | None = Field(default=None)


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

    status: DatabaseTableStatus | None = Field(default=None)
    type: DatabaseTableType | None = Field(default=None)
    table_schema: str | None = Field(default=None, alias="schema", min_length=1, max_length=255)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    color: str | None = Field(default=None, pattern=HEX_COLOR_PATTERN)
    columns: list[DatabaseTableColumnCreateForm] | None = Field(default=None)
    tag_ids: list[uuid.UUID] | None = Field(default=None)


# --- DatabaseMigration ---------------------------------------------------


class DatabaseMigrationCreateForm(CamelBase):
    """Create a migration leaving the database in the path. It starts as a draft."""

    type: DatabaseMigrationType
    title: str = Field(min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    source_database_version_id: uuid.UUID = Field(
        description="Version of the database in the path the migration leaves from."
    )
    destination_database_id: uuid.UUID = Field(
        description="Database the migration lands on. May be the database in the path."
    )
    destination_database_version_id: uuid.UUID = Field(
        description="Version of the destination database the migration lands on."
    )


class DatabaseMigrationPatchForm(CamelBase):
    """Partial update of a migration — only the keys sent are applied."""

    type: DatabaseMigrationType | None = Field(default=None)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    source_database_version_id: uuid.UUID | None = Field(default=None)
    destination_database_id: uuid.UUID | None = Field(default=None)
    destination_database_version_id: uuid.UUID | None = Field(default=None)


# --- DatabaseMigrationColumn ---------------------------------------------


class DatabaseMigrationColumnCreateForm(CamelBase):
    """Create a column step on a migration. It starts as a draft.

    A creation step only needs its destination endpoints, a deletion step only
    its source ones, and a migration step both. A column endpoint always requires
    the table endpoint on the same side.
    """

    type: DatabaseMigrationColumnType
    source_database_table_id: uuid.UUID | None = Field(default=None)
    source_database_table_column_id: uuid.UUID | None = Field(default=None)
    source_database_table_column_subfield_id: uuid.UUID | None = Field(default=None)
    destination_database_table_id: uuid.UUID | None = Field(default=None)
    destination_database_table_column_id: uuid.UUID | None = Field(default=None)
    destination_database_table_column_subfield_id: uuid.UUID | None = Field(default=None)
    transformation_method: str | None = Field(
        default=None,
        max_length=1024,
        description="How the value is reshaped on its way across.",
    )
    description: dict | None = Field(default=None)


class DatabaseMigrationColumnPatchForm(CamelBase):
    """Partial update of a column step — only the keys sent are applied."""

    type: DatabaseMigrationColumnType | None = Field(default=None)
    source_database_table_id: uuid.UUID | None = Field(default=None)
    source_database_table_column_id: uuid.UUID | None = Field(default=None)
    source_database_table_column_subfield_id: uuid.UUID | None = Field(default=None)
    destination_database_table_id: uuid.UUID | None = Field(default=None)
    destination_database_table_column_id: uuid.UUID | None = Field(default=None)
    destination_database_table_column_subfield_id: uuid.UUID | None = Field(default=None)
    transformation_method: str | None = Field(default=None, max_length=1024)
    description: dict | None = Field(default=None)
