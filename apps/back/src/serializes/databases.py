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
    VoteRole,
    VoteValue,
)
from src.serializes._base import CamelBase, TaggableItem, VotableItem
from src.serializes.tags import TagItem
from src.serializes.users import OwnerItem


class DatabaseItem(TaggableItem, VotableItem):
    """A database tracked inside an account."""

    comment_count: int = 0
    votes_counts_by_value: dict[VoteValue, int] = {}
    votes_counts_by_role_value: dict[VoteRole, dict[VoteValue, int]] = {}
    date: datetime
    description: dict | None = None
    id: uuid.UUID
    locked: bool
    locked_by: OwnerItem | None = None
    locked_by_id: uuid.UUID | None = None
    locked_date: datetime | None = None
    owner: OwnerItem
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


class DatabaseTableColumnSubfieldItem(CamelBase):
    """A sub-field of a JSON column. Nesting is read from `parentSubfieldId`."""

    database_column_type_id: uuid.UUID
    description: dict | None = None
    id: uuid.UUID
    name: str
    nullable: bool
    parent_subfield_id: uuid.UUID | None = None
    rank: int


class DatabaseTableColumnItem(TaggableItem, VotableItem):
    """A column of a database table."""

    color: str | None = None
    comment_count: int = 0
    votes_counts_by_value: dict[VoteValue, int] = {}
    votes_counts_by_role_value: dict[VoteRole, dict[VoteValue, int]] = {}
    database_column_type_id: uuid.UUID
    date: datetime
    default_value: str
    description: dict | None = None
    foreign_key_database_table_column_id: uuid.UUID | None = None
    foreign_key_database_table_id: uuid.UUID | None = None
    id: uuid.UUID
    locked: bool
    locked_by: OwnerItem | None = None
    locked_by_id: uuid.UUID | None = None
    locked_date: datetime | None = None
    name: str
    nullable: bool
    owner: OwnerItem
    owner_id: uuid.UUID
    primary_key: bool
    rank: int
    # `None` means "not resolved" (not "no sub-fields"); resolved on column reads.
    subfields: list[DatabaseTableColumnSubfieldItem] | None = None
    system_field: bool
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    unique: bool


class DatabaseTableItem(TaggableItem, VotableItem):
    """A table within a database version.

    `columns` is resolved by the manager on every table read (listing included)
    and on create/update.
    """

    color: str | None = None
    columns: list[DatabaseTableColumnItem] | None = None
    comment_count: int = 0
    votes_counts_by_value: dict[VoteValue, int] = {}
    votes_counts_by_role_value: dict[VoteRole, dict[VoteValue, int]] = {}
    date: datetime
    description: dict | None = None
    id: uuid.UUID
    locked: bool
    locked_by: OwnerItem | None = None
    locked_by_id: uuid.UUID | None = None
    locked_date: datetime | None = None
    name: str
    owner: OwnerItem
    owner_id: uuid.UUID
    status: DatabaseTableStatus
    status_date: datetime
    table_schema: str = Field(serialization_alias="schema")
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    type: DatabaseTableType


class DatabaseMigrationItem(VotableItem):
    """A planned move from a version of one database to a version of another."""

    comment_count: int = 0
    votes_counts_by_value: dict[VoteValue, int] = {}
    votes_counts_by_role_value: dict[VoteRole, dict[VoteValue, int]] = {}
    date: datetime
    description: dict | None = None
    destination_database_id: uuid.UUID
    destination_database_version_id: uuid.UUID
    id: uuid.UUID
    locked: bool
    locked_by: OwnerItem | None = None
    locked_by_id: uuid.UUID | None = None
    locked_date: datetime | None = None
    source_database_id: uuid.UUID
    source_database_version_id: uuid.UUID
    status: DatabaseMigrationStatus
    status_date: datetime
    title: str
    type: DatabaseMigrationType


class DatabaseMigrationColumnItem(VotableItem):
    """One column-level step of a migration.

    A creation only carries destination endpoints, a deletion only source ones,
    and a migration carries both.
    """

    comment_count: int = 0
    votes_counts_by_value: dict[VoteValue, int] = {}
    votes_counts_by_role_value: dict[VoteRole, dict[VoteValue, int]] = {}
    date: datetime
    description: dict | None = None
    destination_database_table_column_id: uuid.UUID | None = None
    destination_database_table_column_subfield_id: uuid.UUID | None = None
    destination_database_table_id: uuid.UUID | None = None
    id: uuid.UUID
    locked: bool
    locked_by: OwnerItem | None = None
    locked_by_id: uuid.UUID | None = None
    locked_date: datetime | None = None
    owner: OwnerItem
    owner_id: uuid.UUID
    source_database_table_column_id: uuid.UUID | None = None
    source_database_table_column_subfield_id: uuid.UUID | None = None
    source_database_table_id: uuid.UUID | None = None
    status: DatabaseMigrationColumnStatus
    status_date: datetime
    transformation_method: str | None = None
    type: DatabaseMigrationColumnType
