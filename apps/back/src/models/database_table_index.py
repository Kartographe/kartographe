# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `database_table_index` table — an index declared on a database table.

An index keys on one or more columns of its table (`column_ids`, ordered) OR on
an `expression` (a functional/expression index such as `(aem_file ->> 'fileId')`
or `lower(email)`). It has an access method (`type`), an optional uniqueness flag
and an optional partial predicate (`where_clause`). For an expression index,
`column_ids` may still list the involved columns to keep the ER graph linked.

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
    # Ordered columns keyed by the index (references `database_table_column.id`).
    # For an expression index these may be empty, or list the involved columns.
    column_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))
    # Key expression of a functional/expression index (raw SQL), e.g.
    # `(aem_file ->> 'fileId')`; unset for a plain column index.
    expression: str | None = Field(default=None)
    # Predicate of a partial index (raw SQL), unset for a full index.
    where_clause: str | None = Field(default=None)
    # Display/sort order among the table's indexes.
    rank: int = Field(default=0, index=True)
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
