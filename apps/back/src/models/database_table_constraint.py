# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `database_table_constraint` table — a constraint declared on a table.

A constraint covers one or more columns of its table (`column_ids`). Depending
on `type` it also carries a check expression (`check`), or a referenced table and
columns plus referential actions (`foreign_key`).

Kept deliberately light: no lock, no search, no comments/votes/tags. The primary
key is also carried by the `primary_key` flag on the column (the source of truth
for the ER view); a `primary_key` constraint here is for full modelling.
"""

import uuid

from sqlalchemy import ARRAY, JSON, Uuid
from sqlmodel import Field

from src.models._base import BaseModel
from src.models.enum import ConstraintType, ReferentialAction


class DatabaseTableConstraint(BaseModel, table=True):
    __tablename__ = "database_table_constraint"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    database_table_id: uuid.UUID = Field(foreign_key="database_table.id", index=True)

    name: str = Field(index=True)
    type: ConstraintType = Field(index=True)
    # Columns the constraint covers (references `database_table_column.id`).
    column_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))
    # Predicate of a `check` constraint (raw SQL), unset otherwise.
    check_expression: str | None = Field(default=None)
    # `foreign_key` target: referenced table and its columns, plus the actions.
    foreign_key_database_table_id: uuid.UUID | None = Field(
        default=None, foreign_key="database_table.id", index=True
    )
    foreign_key_column_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))
    on_delete: ReferentialAction | None = Field(default=None)
    on_update: ReferentialAction | None = Field(default=None)
    # Display/sort order among the table's constraints.
    rank: int = Field(default=0, index=True)
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
