# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""backfill the search index from existing rows

The `search` table starts empty: entities already in the database would only get
indexed on their next write. This data migration seeds one `search` row per
existing searchable entity (and published comment), reproducing in SQL the exact
weighted vector each model's `search_vector()` builds in Python.

Tiptap rich-text (`description`/`value` JSON) is flattened with a temporary
recursive helper — the SQL counterpart of `src.utils.tiptap.tiptap_to_text`.
Idempotent: `ON CONFLICT (entity_id) DO NOTHING`, so re-running (or running after
the listeners have already indexed some rows) is safe.

Revision ID: 20260718123000
Revises: 20260718120000
Create Date: 2026-07-18 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = '20260718123000'
down_revision: Union[str, None] = '20260718120000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Recursive Tiptap → text helper, scoped to the transaction (pg_temp). Walks the
# ProseMirror node tree and joins every `text` leaf — mirrors tiptap_to_text.
_TIPTAP_FN = """
CREATE FUNCTION pg_temp.tiptap_text(doc jsonb) RETURNS text AS $$
    WITH RECURSIVE nodes(node) AS (
        SELECT doc
        WHERE jsonb_typeof(doc) = 'object'
        UNION ALL
        SELECT child
        FROM nodes, jsonb_array_elements(node->'content') AS child
        WHERE jsonb_typeof(node->'content') = 'array'
    )
    SELECT string_agg(node->>'text', ' ')
    FROM nodes
    WHERE node ? 'text';
$$ LANGUAGE sql IMMUTABLE;
"""

# One INSERT per searchable entity. `_a`/`_b`/`_c` are the SQL expressions for
# the A/B/C weight buckets, matching each model's search_vector(). `where` skips
# rows that would produce an empty vector (the indexer never keeps those).
_TSVECTOR = "gen_random_uuid(), true, now(), now(), account_id, '{entity_type}', id, 'french', {vector}"


def _weighted(parts: list[tuple[str, str]]) -> str:
    """`setweight(to_tsvector('french', <expr>), '<w>') || …` for each (weight, expr)."""
    pieces = [
        f"setweight(to_tsvector('french', coalesce({expr}, '')), '{weight}')"
        for weight, expr in parts
    ]
    return " || ".join(pieces)


# (entity_type, source table, [(weight, sql expr)…], extra WHERE)
_SOURCES = [
    ("feature", "feature", [("A", "title"), ("B", "pg_temp.tiptap_text(description::jsonb)")], None),
    # Application's description is plain text, not Tiptap.
    ("application", "application", [("A", "title"), ("B", "description")], None),
    ("application_route", "application_route",
     [("A", "concat_ws(' ', title, path)"), ("B", "pg_temp.tiptap_text(description::jsonb)")], None),
    ("journey", "journey", [("A", "title"), ("B", "pg_temp.tiptap_text(description::jsonb)")], None),
    ("journey_scenario", "journey_scenario",
     [("A", "title"), ("B", "pg_temp.tiptap_text(description::jsonb)")], None),
    ("journey_scenario_step", "journey_scenario_step",
     [("A", "title"), ("B", "pg_temp.tiptap_text(description::jsonb)")], None),
    ("persona", "persona", [("A", "title"), ("B", "pg_temp.tiptap_text(description::jsonb)")], None),
    ("database", "database", [("A", "title"), ("B", "pg_temp.tiptap_text(description::jsonb)")], None),
    ("database_table", "database_table",
     [("A", "name"), ("B", "pg_temp.tiptap_text(description::jsonb)"), ("C", '"schema"')], None),
    ("database_table_column", "database_table_column",
     [("A", "name"), ("B", "pg_temp.tiptap_text(description::jsonb)")], None),
    ("database_migration", "database_migration",
     [("A", "title"), ("B", "pg_temp.tiptap_text(description::jsonb)")], None),
    ("database_migration_column", "database_migration_column",
     [("A", "pg_temp.tiptap_text(description::jsonb)"), ("B", "transformation_method")],
     "(description IS NOT NULL OR transformation_method IS NOT NULL)"),
    ("service", "service", [("A", "title"), ("B", "pg_temp.tiptap_text(description::jsonb)")], None),
    ("service_action", "service_action",
     [("A", "concat_ws(' ', title, path)"), ("B", "pg_temp.tiptap_text(description::jsonb)")], None),
    ("comment", "comment", [("A", "pg_temp.tiptap_text(value::jsonb)")],
     "status = 'published' AND value IS NOT NULL"),
]


def upgrade() -> None:
    op.execute(_TIPTAP_FN)

    for entity_type, table, parts, extra_where in _SOURCES:
        vector = _weighted(parts)
        where = "enabled = true"
        if extra_where:
            where = f"{where} AND {extra_where}"
        op.execute(
            f"INSERT INTO search (id, enabled, created_at, updated_at, account_id, "
            f"entity_type, entity_id, language, vector) "
            f"SELECT {_TSVECTOR.format(entity_type=entity_type, vector=vector)} "
            f"FROM {table} WHERE {where} "
            f"ON CONFLICT (entity_id) DO NOTHING"
        )


def downgrade() -> None:
    # Drop only the backfilled rows; live rows maintained by the listeners since
    # this migration ran are indistinguishable, so clear the whole index and let
    # writes re-seed it. Safe: the index is derived data.
    op.execute("DELETE FROM search")
