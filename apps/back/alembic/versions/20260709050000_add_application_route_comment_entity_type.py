# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""add application_route to comment_entity_type

The `comment_entity_type` enum already exists in the database, so the new value
is appended with `ALTER TYPE … ADD VALUE` (Postgres 12+ allows this inside a
transaction as long as the value is not used in the same one).

Downgrade cannot drop an enum value in place: the type is recreated without it,
after removing the comments that used it.

Revision ID: 20260709050000
Revises: 20260709040000
Create Date: 2026-07-09 03:10:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = '20260709050000'
down_revision: Union[str, None] = '20260709040000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The enum's members, in declaration order, without `application_route`.
_WITHOUT_APPLICATION_ROUTE = (
    'feature',
    'application',
    'journey',
    'persona',
    'database',
    'database_table',
    'database_table_column',
)


def upgrade() -> None:
    op.execute(
        "ALTER TYPE comment_entity_type ADD VALUE IF NOT EXISTS 'application_route' AFTER 'application'"
    )


def downgrade() -> None:
    values = ", ".join(f"'{value}'" for value in _WITHOUT_APPLICATION_ROUTE)
    op.execute("DELETE FROM comment WHERE entity_type = 'application_route'")
    op.execute('ALTER TYPE comment_entity_type RENAME TO comment_entity_type_old')
    op.execute(f'CREATE TYPE comment_entity_type AS ENUM ({values})')
    op.execute(
        'ALTER TABLE comment ALTER COLUMN entity_type TYPE comment_entity_type '
        'USING entity_type::text::comment_entity_type'
    )
    op.execute('DROP TYPE comment_entity_type_old')
