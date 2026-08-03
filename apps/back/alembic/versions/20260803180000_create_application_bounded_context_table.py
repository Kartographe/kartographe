# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""create application bounded context table

Adds `application_bounded_context` — named areas of an application's domain,
each holding the components inside the boundary — and opens the shared
polymorphic enums to it so a context can be commented, voted on, estimated and
indexed for search.

Revision ID: 20260803180000
Revises: 20260803170000
Create Date: 2026-08-03 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '20260803180000'
down_revision: Union[str, None] = '20260803170000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# `entity_type` members before `application_bounded_context` is appended —
# needed to rebuild the type on downgrade (Postgres cannot drop a value in place).
_ENTITY_TYPE_WITHOUT_CONTEXT = (
    'feature', 'application', 'application_route', 'journey', 'persona', 'database',
    'database_table', 'database_table_column', 'database_migration',
    'database_migration_column', 'service', 'service_action', 'journey_scenario',
    'journey_scenario_step', 'application_component',
)


def upgrade() -> None:
    # 1. Open the shared polymorphic enums to the new kind. Appending matches
    #    the Python enum order, and the value is not used in this transaction —
    #    which Postgres would reject.
    op.execute("ALTER TYPE entity_type ADD VALUE IF NOT EXISTS 'application_bounded_context'")
    op.execute("ALTER TYPE search_entity_type ADD VALUE IF NOT EXISTS 'application_bounded_context'")

    # 2. The bounded-context table.
    op.create_table(
        'application_bounded_context',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('account_id', sa.Uuid(), nullable=False),
        sa.Column('application_id', sa.Uuid(), nullable=False),
        sa.Column('owner_id', sa.Uuid(), nullable=False),
        sa.Column('application_component_ids', postgresql.ARRAY(sa.Uuid()), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.JSON(), nullable=True),
        sa.Column('locked', sa.Boolean(), nullable=False),
        sa.Column('locked_by_id', sa.Uuid(), nullable=True),
        sa.Column('locked_date', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['account.id'], ),
        sa.ForeignKeyConstraint(['application_id'], ['application.id'], ),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id'], ),
        sa.ForeignKeyConstraint(['locked_by_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_application_bounded_context_account_id'), 'application_bounded_context', ['account_id'], unique=False)
    op.create_index(op.f('ix_application_bounded_context_application_id'), 'application_bounded_context', ['application_id'], unique=False)
    op.create_index(op.f('ix_application_bounded_context_locked_by_id'), 'application_bounded_context', ['locked_by_id'], unique=False)
    op.create_index(op.f('ix_application_bounded_context_owner_id'), 'application_bounded_context', ['owner_id'], unique=False)
    op.create_index(op.f('ix_application_bounded_context_title'), 'application_bounded_context', ['title'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_application_bounded_context_title'), table_name='application_bounded_context')
    op.drop_index(op.f('ix_application_bounded_context_owner_id'), table_name='application_bounded_context')
    op.drop_index(op.f('ix_application_bounded_context_locked_by_id'), table_name='application_bounded_context')
    op.drop_index(op.f('ix_application_bounded_context_application_id'), table_name='application_bounded_context')
    op.drop_index(op.f('ix_application_bounded_context_account_id'), table_name='application_bounded_context')
    op.drop_table('application_bounded_context')

    # Drop the shared-enum members by rebuilding each type without them, after
    # removing the rows that used them.
    values = ", ".join(f"'{value}'" for value in _ENTITY_TYPE_WITHOUT_CONTEXT)
    op.execute("DELETE FROM comment WHERE entity_type = 'application_bounded_context'")
    op.execute("DELETE FROM vote WHERE entity_type = 'application_bounded_context'")
    op.execute("DELETE FROM complexity WHERE entity_type = 'application_bounded_context'")
    op.execute('ALTER TYPE entity_type RENAME TO entity_type_old')
    op.execute(f'CREATE TYPE entity_type AS ENUM ({values})')
    for table in ('comment', 'vote', 'complexity'):
        op.execute(
            f'ALTER TABLE {table} ALTER COLUMN entity_type TYPE entity_type '
            'USING entity_type::text::entity_type'
        )
    op.execute('DROP TYPE entity_type_old')

    op.execute("DELETE FROM search WHERE entity_type = 'application_bounded_context'")
    op.execute('ALTER TYPE search_entity_type RENAME TO search_entity_type_old')
    op.execute(f"CREATE TYPE search_entity_type AS ENUM ({values}, 'comment')")
    op.execute(
        'ALTER TABLE search ALTER COLUMN entity_type TYPE search_entity_type '
        'USING entity_type::text::search_entity_type'
    )
    op.execute('DROP TYPE search_entity_type_old')
