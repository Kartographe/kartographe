# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""add color to tables/columns and tag_ids to columns

Columns can now be tagged, so `tag_entity_type` gains a `database_table_column`
member (appended with `ALTER TYPE … ADD VALUE`, the type already exists).

Downgrade cannot drop an enum value in place: the type is recreated without it,
after removing the tags that used it.

Revision ID: 20260709140000
Revises: 20260709124552
Create Date: 2026-07-09 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


revision: str = '20260709140000'
down_revision: Union[str, None] = '20260709124552'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The enum's members, in declaration order, without `database_table_column`.
_WITHOUT_DATABASE_TABLE_COLUMN = (
    'application',
    'application_route',
    'application_guard',
    'feature',
    'journey',
    'journey_scenario',
    'journey_scenario_step',
    'persona',
    'database',
    'database_table',
)


def upgrade() -> None:
    op.add_column(
        'database_table',
        sa.Column('color', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'database_table_column',
        sa.Column('color', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'database_table_column',
        sa.Column(
            'tag_ids',
            sa.ARRAY(sa.Uuid()),
            nullable=False,
            server_default=sa.text("'{}'"),
        ),
    )
    op.execute(
        "ALTER TYPE tag_entity_type ADD VALUE IF NOT EXISTS 'database_table_column' "
        "AFTER 'database_table'"
    )


def downgrade() -> None:
    values = ", ".join(f"'{value}'" for value in _WITHOUT_DATABASE_TABLE_COLUMN)
    op.execute("DELETE FROM tag WHERE entity_type = 'database_table_column'")
    op.execute('ALTER TYPE tag_entity_type RENAME TO tag_entity_type_old')
    op.execute(f'CREATE TYPE tag_entity_type AS ENUM ({values})')
    op.execute(
        'ALTER TABLE tag ALTER COLUMN entity_type TYPE tag_entity_type '
        'USING entity_type::text::tag_entity_type'
    )
    op.execute('DROP TYPE tag_entity_type_old')
    op.drop_column('database_table_column', 'tag_ids')
    op.drop_column('database_table_column', 'color')
    op.drop_column('database_table', 'color')
