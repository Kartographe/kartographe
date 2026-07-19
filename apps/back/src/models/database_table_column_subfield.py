# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `database_table_column_subfield` table — a sub-field of a JSON column.

A JSON column can carry a nested, typed structure. Each sub-field references a
catalogued column type and may itself contain sub-fields
(`parent_subfield_id`, a self-reference) — modelling arbitrarily nested JSON.

Kept deliberately light: no lock, no search, no comments/votes/tags. Sub-fields
are managed inline with their column or through the dedicated sub-field routes.
"""

import uuid
from typing import TYPE_CHECKING, ClassVar

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel

if TYPE_CHECKING:
    from src.models.database_column_type import DatabaseColumnType


class DatabaseTableColumnSubfield(BaseModel, table=True):
    __tablename__ = "database_table_column_subfield"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    database_table_column_id: uuid.UUID = Field(
        foreign_key="database_table_column.id", index=True
    )
    # Self-reference: the parent sub-field for nested JSON, unset at the top level.
    parent_subfield_id: uuid.UUID | None = Field(
        default=None, foreign_key="database_table_column_subfield.id", index=True
    )
    database_column_type_id: uuid.UUID = Field(
        foreign_key="database_column_type.id", index=True
    )

    name: str = Field(index=True)
    nullable: bool = Field(default=False)
    # Display/sort order among its siblings (same parent, same column).
    rank: int = Field(default=0, index=True)
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)

    column_type: "DatabaseColumnType" = Relationship()
