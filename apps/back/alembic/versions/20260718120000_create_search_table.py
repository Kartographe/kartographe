# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""create search table (full-text index)

Adds the Postgres-native full-text search index: one `search` row per searchable
entity, holding a weighted `tsvector` scoped to an `account_id`. Enables the
`btree_gin` extension so the composite GIN index can carry the b-tree-typed
`account_id`/`entity_type` alongside the `tsvector`, letting a query narrow to an
account (and type) inside the index scan before the `@@` match.

Revision ID: 20260718120000
Revises: 20260718110712
Create Date: 2026-07-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '20260718120000'
down_revision: Union[str, None] = '20260718110712'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Superset of entity_type: every searchable entity, plus `comment`.
_SEARCH_ENTITY_TYPE_VALUES = (
    'feature', 'application', 'application_route', 'journey', 'persona', 'database',
    'database_table', 'database_table_column', 'database_migration',
    'database_migration_column', 'service', 'service_action', 'journey_scenario',
    'journey_scenario_step', 'comment',
)


def upgrade() -> None:
    # b-tree-typed columns (uuid, enum) can only share a GIN index with the
    # tsvector once this extension provides the operator classes.
    op.execute('CREATE EXTENSION IF NOT EXISTS btree_gin')

    op.execute(
        f"CREATE TYPE search_entity_type AS ENUM {_SEARCH_ENTITY_TYPE_VALUES!r}".replace('"', "'")
    )

    op.create_table(
        'search',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('account_id', sa.Uuid(), nullable=False),
        sa.Column(
            'entity_type',
            postgresql.ENUM(*_SEARCH_ENTITY_TYPE_VALUES, name='search_entity_type', create_type=False),
            nullable=False,
        ),
        sa.Column('entity_id', sa.Uuid(), nullable=False),
        sa.Column('language', sa.String(), nullable=False),
        sa.Column('vector', postgresql.TSVECTOR(), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['account.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('entity_id', name='uq_search_entity_id'),
    )
    op.create_index(op.f('ix_search_account_id'), 'search', ['account_id'], unique=False)
    op.create_index(op.f('ix_search_entity_id'), 'search', ['entity_id'], unique=False)
    # Composite GIN: filter by account/type, then match the tsvector, in one scan.
    op.create_index(
        'ix_search_account_type_vector',
        'search',
        ['account_id', 'entity_type', 'vector'],
        unique=False,
        postgresql_using='gin',
    )


def downgrade() -> None:
    op.drop_index('ix_search_account_type_vector', table_name='search')
    op.drop_index(op.f('ix_search_entity_id'), table_name='search')
    op.drop_index(op.f('ix_search_account_id'), table_name='search')
    op.drop_table('search')
    op.execute('DROP TYPE IF EXISTS search_entity_type')
    # `btree_gin` is left installed — other indexes may come to rely on it.
