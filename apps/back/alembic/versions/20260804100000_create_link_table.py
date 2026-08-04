# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""create link table

External references attached to an account entity, polymorphic over the shared
`entity_type` enum like `comment` and `complexity`.

Revision ID: 20260804100000
Revises: 20260803180000
Create Date: 2026-08-04 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '20260804100000'
down_revision: Union[str, None] = '20260803180000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The centralized entity-type values, in the order the Postgres enum holds them.
_ENTITY_TYPE_VALUES = (
    'feature', 'application', 'application_route', 'journey', 'persona', 'database',
    'database_table', 'database_table_column', 'database_migration',
    'database_migration_column', 'service', 'service_action', 'journey_scenario',
    'journey_scenario_step', 'application_component', 'application_bounded_context',
)
_LINK_TYPE_VALUES = ('ticket', 'documentation', 'design', 'kartographe', 'other')


def upgrade() -> None:
    # The kind enum, created up front: `create_table` would create it too, but
    # naming it explicitly keeps the drop symmetric in `downgrade`.
    op.execute(f"CREATE TYPE link_type AS ENUM {_LINK_TYPE_VALUES!r}".replace('"', "'"))

    op.create_table(
        'link',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('account_id', sa.Uuid(), nullable=False),
        sa.Column('owner_id', sa.Uuid(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        # `entity_type` already exists (shared with `comment`, `vote` and
        # `complexity`); reference it without re-creating it.
        sa.Column('entity_type', postgresql.ENUM(*_ENTITY_TYPE_VALUES, name='entity_type', create_type=False), nullable=False),
        sa.Column('entity_id', sa.Uuid(), nullable=False),
        sa.Column('type', postgresql.ENUM(*_LINK_TYPE_VALUES, name='link_type', create_type=False), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=True),
        sa.Column('description', sa.JSON(), nullable=True),
        sa.Column('url', sa.String(length=2048), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['account.id'], ),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_link_account_id'), 'link', ['account_id'], unique=False)
    op.create_index(op.f('ix_link_entity_id'), 'link', ['entity_id'], unique=False)
    op.create_index(op.f('ix_link_entity_type'), 'link', ['entity_type'], unique=False)
    op.create_index(op.f('ix_link_owner_id'), 'link', ['owner_id'], unique=False)
    op.create_index(op.f('ix_link_type'), 'link', ['type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_link_type'), table_name='link')
    op.drop_index(op.f('ix_link_owner_id'), table_name='link')
    op.drop_index(op.f('ix_link_entity_type'), table_name='link')
    op.drop_index(op.f('ix_link_entity_id'), table_name='link')
    op.drop_index(op.f('ix_link_account_id'), table_name='link')
    op.drop_table('link')
    op.execute('DROP TYPE IF EXISTS link_type')
