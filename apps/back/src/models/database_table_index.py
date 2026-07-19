# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `database_table_index` table — an index declared on a database table.

An index covers one or more columns of its table (`column_ids`, ordered), with
an access method (`type`), an optional uniqueness flag and an optional partial
predicate (`where_clause`).

Kept deliberately light: no lock, no search, no comments/votes/tags.
"""

import uuid

from sqlalchemy import ARRAY, JSON, Uuid
from sqlmodel import Field

from src.models._base import BaseModel
from src.models.enum import IndexType


class DatabaseTableIndex(BaseModel, table=True):
    __tablename__ = "database_table_index"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    database_table_id: uuid.UUID = Field(foreign_key="database_table.id", index=True)

    name: str = Field(index=True)
    type: IndexType = Field(default=IndexType.BTREE, index=True)
    unique: bool = Field(default=False)
    # Ordered columns covered by the index (references `database_table_column.id`).
    column_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))
    # Predicate of a partial index (raw SQL), unset for a full index.
    where_clause: str | None = Field(default=None)
    # Display/sort order among the table's indexes.
    rank: int = Field(default=0, index=True)
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
