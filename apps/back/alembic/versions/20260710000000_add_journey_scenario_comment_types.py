"""add journey scenario comment entity types

Scenarios and their steps can be commented, so `comment_entity_type` gains the
two new members.

Revision ID: 20260710000000
Revises: 20260709141334
Create Date: 2026-07-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = '20260710000000'
down_revision: Union[str, None] = '20260709141334'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# `comment_entity_type` members, in order, before the journey-scenario ones are
# appended.
_COMMENT_ENTITY_TYPE_WITHOUT_SCENARIOS = (
    'feature',
    'application',
    'application_route',
    'journey',
    'persona',
    'database',
    'database_table',
    'database_table_column',
    'service',
    'service_action',
    'database_migration',
    'database_migration_column',
)


def upgrade() -> None:
    # `comment_entity_type` already exists: append the two new members. No
    # `AFTER <value>` clause — referencing a value added in the same transaction
    # is rejected by Postgres, and appending matches the Python enum order.
    op.execute("ALTER TYPE comment_entity_type ADD VALUE IF NOT EXISTS 'journey_scenario'")
    op.execute("ALTER TYPE comment_entity_type ADD VALUE IF NOT EXISTS 'journey_scenario_step'")


def downgrade() -> None:
    # Postgres cannot drop an enum value in place: recreate `comment_entity_type`
    # without the scenario members, after removing the comments that used them.
    values = ", ".join(f"'{value}'" for value in _COMMENT_ENTITY_TYPE_WITHOUT_SCENARIOS)
    op.execute(
        "DELETE FROM comment WHERE entity_type IN "
        "('journey_scenario', 'journey_scenario_step')"
    )
    op.execute('ALTER TYPE comment_entity_type RENAME TO comment_entity_type_old')
    op.execute(f'CREATE TYPE comment_entity_type AS ENUM ({values})')
    op.execute(
        'ALTER TABLE comment ALTER COLUMN entity_type TYPE comment_entity_type '
        'USING entity_type::text::comment_entity_type'
    )
    op.execute('DROP TYPE comment_entity_type_old')
