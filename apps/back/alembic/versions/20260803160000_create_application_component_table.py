# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""create application component table

Adds the `application_component` table — the building blocks an application is
made of — and opens the shared polymorphic enums to it so a component can be
tagged, commented, voted on, estimated and indexed for search.

Revision ID: 20260803160000
Revises: 20260803150000
Create Date: 2026-08-03 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '20260803160000'
down_revision: Union[str, None] = '20260803150000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COMPONENT_TYPE_VALUES = ('frontend', 'backend', 'library', 'worker', 'integration', 'other')
_COMPONENT_STATUS_VALUES = ('draft', 'active', 'archived')

# `entity_type` members before `application_component` is appended — needed to
# rebuild the type on downgrade (Postgres cannot drop an enum value in place).
_ENTITY_TYPE_WITHOUT_COMPONENT = (
    'feature', 'application', 'application_route', 'journey', 'persona', 'database',
    'database_table', 'database_table_column', 'database_migration',
    'database_migration_column', 'service', 'service_action', 'journey_scenario',
    'journey_scenario_step',
)


def upgrade() -> None:
    # 1. The component's own enums.
    op.execute(f"CREATE TYPE application_component_type AS ENUM {_COMPONENT_TYPE_VALUES!r}".replace('"', "'"))
    op.execute(f"CREATE TYPE application_component_status AS ENUM {_COMPONENT_STATUS_VALUES!r}".replace('"', "'"))

    # 2. Open the shared polymorphic enums to the new kind. No `AFTER <value>`
    #    clause — appending matches the Python enum order — and no use of the
    #    new value in this same transaction, which Postgres rejects.
    op.execute("ALTER TYPE entity_type ADD VALUE IF NOT EXISTS 'application_component'")
    op.execute("ALTER TYPE search_entity_type ADD VALUE IF NOT EXISTS 'application_component'")
    op.execute("ALTER TYPE tag_entity_type ADD VALUE IF NOT EXISTS 'application_component'")

    # 3. The component table.
    op.create_table(
        'application_component',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('account_id', sa.Uuid(), nullable=False),
        sa.Column('application_id', sa.Uuid(), nullable=False),
        sa.Column('owner_id', sa.Uuid(), nullable=False),
        sa.Column('tag_ids', postgresql.ARRAY(sa.Uuid()), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column(
            'status',
            postgresql.ENUM(*_COMPONENT_STATUS_VALUES, name='application_component_status', create_type=False),
            nullable=False,
        ),
        sa.Column('status_date', sa.DateTime(), nullable=False),
        sa.Column(
            'type',
            postgresql.ENUM(*_COMPONENT_TYPE_VALUES, name='application_component_type', create_type=False),
            nullable=False,
        ),
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
    op.create_index(op.f('ix_application_component_account_id'), 'application_component', ['account_id'], unique=False)
    op.create_index(op.f('ix_application_component_application_id'), 'application_component', ['application_id'], unique=False)
    op.create_index(op.f('ix_application_component_locked_by_id'), 'application_component', ['locked_by_id'], unique=False)
    op.create_index(op.f('ix_application_component_owner_id'), 'application_component', ['owner_id'], unique=False)
    op.create_index(op.f('ix_application_component_status'), 'application_component', ['status'], unique=False)
    op.create_index(op.f('ix_application_component_title'), 'application_component', ['title'], unique=False)
    op.create_index(op.f('ix_application_component_type'), 'application_component', ['type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_application_component_type'), table_name='application_component')
    op.drop_index(op.f('ix_application_component_title'), table_name='application_component')
    op.drop_index(op.f('ix_application_component_status'), table_name='application_component')
    op.drop_index(op.f('ix_application_component_owner_id'), table_name='application_component')
    op.drop_index(op.f('ix_application_component_locked_by_id'), table_name='application_component')
    op.drop_index(op.f('ix_application_component_application_id'), table_name='application_component')
    op.drop_index(op.f('ix_application_component_account_id'), table_name='application_component')
    op.drop_table('application_component')
    op.execute('DROP TYPE IF EXISTS application_component_status')
    op.execute('DROP TYPE IF EXISTS application_component_type')

    # Drop the shared-enum members by rebuilding each type without them, after
    # removing the rows that used them.
    values = ", ".join(f"'{value}'" for value in _ENTITY_TYPE_WITHOUT_COMPONENT)
    op.execute("DELETE FROM comment WHERE entity_type = 'application_component'")
    op.execute("DELETE FROM vote WHERE entity_type = 'application_component'")
    op.execute("DELETE FROM complexity WHERE entity_type = 'application_component'")
    op.execute('ALTER TYPE entity_type RENAME TO entity_type_old')
    op.execute(f'CREATE TYPE entity_type AS ENUM ({values})')
    for table in ('comment', 'vote', 'complexity'):
        op.execute(
            f'ALTER TABLE {table} ALTER COLUMN entity_type TYPE entity_type '
            'USING entity_type::text::entity_type'
        )
    op.execute('DROP TYPE entity_type_old')

    op.execute("DELETE FROM search WHERE entity_type = 'application_component'")
    op.execute("DELETE FROM tag WHERE entity_type = 'application_component'")
    op.execute(
        "ALTER TYPE search_entity_type RENAME TO search_entity_type_old"
    )
    op.execute(
        f"CREATE TYPE search_entity_type AS ENUM ({values}, 'comment')"
    )
    op.execute(
        'ALTER TABLE search ALTER COLUMN entity_type TYPE search_entity_type '
        'USING entity_type::text::search_entity_type'
    )
    op.execute('DROP TYPE search_entity_type_old')

    tag_values = ", ".join(
        f"'{value}'"
        for value in (
            'application', 'application_route', 'application_guard', 'feature', 'journey',
            'journey_scenario', 'journey_scenario_step', 'persona', 'database',
            'database_table', 'database_table_column',
        )
    )
    op.execute('ALTER TYPE tag_entity_type RENAME TO tag_entity_type_old')
    op.execute(f'CREATE TYPE tag_entity_type AS ENUM ({tag_values})')
    op.execute(
        'ALTER TABLE tag ALTER COLUMN entity_type TYPE tag_entity_type '
        'USING entity_type::text::tag_entity_type'
    )
    op.execute('DROP TYPE tag_entity_type_old')
