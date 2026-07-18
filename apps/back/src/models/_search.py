# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Searchable mixin: opt a table into the full-text `search` index.

A model adds `Searchable` to its bases, declares its `SEARCH_ENTITY_TYPE`, and
implements `search_vector()` — a pure, DB-free read of its own text attributes
grouped by tsvector weight (A > B > C > D). The indexer
(`src/services/search_indexer.py`) turns that into a Postgres `tsvector` and
upserts one `search` row per entity, in the same transaction as the write.

Nothing here touches the session: `build_tsvector()` returns a SQLAlchemy SQL
expression (server-side `to_tsvector(...)`), never a materialised value, so the
weighting/stemming happens in Postgres with the row's configured language.
"""

from typing import ClassVar

from sqlalchemy import func

from src.models.enum import SearchEntityType


class Searchable:
    """Mixin marking a table for the `search` full-text index.

    Not a table and not a SQLModel base — a plain mixin added alongside
    `BaseModel`, so it adds no columns of its own.
    """

    # Concrete models set this to their `SearchEntityType` member.
    SEARCH_ENTITY_TYPE: ClassVar[SearchEntityType]
    # Postgres text-search configuration used to build the tsvector. Content is
    # French by default; a model may override per its language.
    SEARCH_LANGUAGE: ClassVar[str] = "french"

    def search_vector(self) -> dict[str, list[str | None]]:
        """Text to index, grouped by tsvector weight (`"A"`..`"D"`).

        Must be pure — read local attributes only, no DB access. `None`/empty
        values are dropped; an all-empty result deletes the entity's index row.
        Override in each model, e.g. `{"A": [self.title], "B": [description]}`.
        """
        raise NotImplementedError

    def build_tsvector(self):
        """SQL expression for this entity's weighted `tsvector`.

        Combines each weight bucket with `setweight(to_tsvector(cfg, …), weight)`
        joined by `||`. Returns an empty-string tsvector when there is nothing to
        index, which the indexer treats as "remove the row".
        """
        parts = []
        for weight, values in self.search_vector().items():
            non_null = [str(value) for value in values if value]
            if not non_null:
                continue
            concat = func.concat_ws(" ", *non_null)
            parts.append(func.setweight(func.to_tsvector(self.SEARCH_LANGUAGE, concat), weight))

        if not parts:
            return func.to_tsvector(self.SEARCH_LANGUAGE, "")

        vector = parts[0]
        for part in parts[1:]:
            vector = vector.op("||")(part)
        return vector

    def has_search_content(self) -> bool:
        """Whether `search_vector()` yields any indexable text right now."""
        return any(
            value for values in self.search_vector().values() for value in values
        )
