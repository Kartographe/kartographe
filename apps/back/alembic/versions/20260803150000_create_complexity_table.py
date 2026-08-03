# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""create complexity table and account complexity modes

Adds the estimation scales an account works on (technical / product) and the
`complexity` table holding one estimate per member and entity, polymorphic over
the shared `entity_type` enum like `vote`.

Revision ID: 20260803150000
Revises: 20260803090000
Create Date: 2026-08-03 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '20260803150000'
down_revision: Union[str, None] = '20260803090000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The centralized entity-type values, in the order the Postgres enum holds them.
_ENTITY_TYPE_VALUES = (
    'feature', 'application', 'application_route', 'journey', 'persona', 'database',
    'database_table', 'database_table_column', 'database_migration',
    'database_migration_column', 'service', 'service_action', 'journey_scenario',
    'journey_scenario_step',
)
_COMPLEXITY_MODE_VALUES = ('fibonacci', 'modified_fibonacci', 'powers_of_two', 'linear')


def upgrade() -> None:
    # 1. The scale enum, created up front: an `ADD COLUMN` does not create the
    #    type on an existing table, and three columns reference it.
    op.execute(f"CREATE TYPE complexity_mode AS ENUM {_COMPLEXITY_MODE_VALUES!r}".replace('"', "'"))

    # 2. Existing accounts adopt the defaults: Fibonacci on the technical side,
    #    linear on the product side.
    op.add_column(
        'account',
        sa.Column(
            'technical_complexity_mode',
            postgresql.ENUM(*_COMPLEXITY_MODE_VALUES, name='complexity_mode', create_type=False),
            nullable=False,
            server_default='fibonacci',
        ),
    )
    op.add_column(
        'account',
        sa.Column(
            'product_complexity_mode',
            postgresql.ENUM(*_COMPLEXITY_MODE_VALUES, name='complexity_mode', create_type=False),
            nullable=False,
            server_default='linear',
        ),
    )
    op.alter_column('account', 'technical_complexity_mode', server_default=None)
    op.alter_column('account', 'product_complexity_mode', server_default=None)

    # 3. The complexity table.
    op.create_table(
        'complexity',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('account_id', sa.Uuid(), nullable=False),
        sa.Column('owner_id', sa.Uuid(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        # `entity_type` already exists (shared with `comment` and `vote`);
        # reference it without re-creating it.
        sa.Column('entity_type', postgresql.ENUM(*_ENTITY_TYPE_VALUES, name='entity_type', create_type=False), nullable=False),
        sa.Column('entity_id', sa.Uuid(), nullable=False),
        sa.Column('mode', postgresql.ENUM(*_COMPLEXITY_MODE_VALUES, name='complexity_mode', create_type=False), nullable=False),
        # Nullable: "cannot estimate yet" is an answer, not a missing row.
        sa.Column('value', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['account.id'], ),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_complexity_account_id'), 'complexity', ['account_id'], unique=False)
    op.create_index(op.f('ix_complexity_entity_id'), 'complexity', ['entity_id'], unique=False)
    op.create_index(op.f('ix_complexity_entity_type'), 'complexity', ['entity_type'], unique=False)
    op.create_index(op.f('ix_complexity_mode'), 'complexity', ['mode'], unique=False)
    op.create_index(op.f('ix_complexity_owner_id'), 'complexity', ['owner_id'], unique=False)
    op.create_index(op.f('ix_complexity_value'), 'complexity', ['value'], unique=False)
    # At most one live estimate per member and entity.
    op.create_index(
        'unique_complexity_active',
        'complexity',
        ['account_id', 'entity_type', 'entity_id', 'owner_id'],
        unique=True,
        postgresql_where=sa.text('enabled'),
    )


def downgrade() -> None:
    op.drop_index('unique_complexity_active', table_name='complexity')
    op.drop_index(op.f('ix_complexity_value'), table_name='complexity')
    op.drop_index(op.f('ix_complexity_owner_id'), table_name='complexity')
    op.drop_index(op.f('ix_complexity_mode'), table_name='complexity')
    op.drop_index(op.f('ix_complexity_entity_type'), table_name='complexity')
    op.drop_index(op.f('ix_complexity_entity_id'), table_name='complexity')
    op.drop_index(op.f('ix_complexity_account_id'), table_name='complexity')
    op.drop_table('complexity')
    op.drop_column('account', 'product_complexity_mode')
    op.drop_column('account', 'technical_complexity_mode')
    op.execute('DROP TYPE IF EXISTS complexity_mode')
