# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `search` table — one full-text index row per searchable entity.

Postgres-native search: no external engine. Each `Searchable` entity keeps a
single row here (`entity_id` is UNIQUE, so the indexer can `INSERT … ON CONFLICT
(entity_id)`), carrying a weighted `tsvector` scoped to its `account_id`.

Two indexes back the two access paths:
- a composite **GIN** index `(account_id, entity_type, vector)` — needs the
  `btree_gin` extension so the b-tree-typed `account_id`/`entity_type` can sit in
  the same GIN index as the `tsvector`; lets a query narrow to an account (and
  optionally a type) inside the index scan before the `@@` match;
- a plain **b-tree** on `entity_id` — the indexer's upsert/delete lookup key.
"""

import uuid
from typing import Any

from sqlalchemy import Column, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlmodel import Field

from src.models._base import BaseModel
from src.models.enum import SearchEntityType


class Search(BaseModel, table=True):
    __tablename__ = "search"

    __table_args__ = (
        UniqueConstraint("entity_id", name="uq_search_entity_id"),
        Index(
            "ix_search_account_type_vector",
            "account_id",
            "entity_type",
            "vector",
            postgresql_using="gin",
        ),
        Index("ix_search_entity_id", "entity_id"),
    )

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    entity_type: SearchEntityType
    entity_id: uuid.UUID
    # Postgres text-search configuration the vector was built with (e.g. "french").
    language: str
    # Weighted tsvector; only ever matched (`@@`) in SQL, never read into Python.
    vector: Any = Field(default=None, sa_column=Column(TSVECTOR, nullable=False))
