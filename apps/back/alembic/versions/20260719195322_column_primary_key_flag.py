# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""column primary_key flag

Revision ID: 20260719195322
Revises: 20260719194646
Create Date: 2026-07-19 21:53:22.662504

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


revision: str = '20260719195322'
down_revision: Union[str, None] = '20260719194646'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default backfills existing rows (no column is a PK by default);
    # dropped afterwards so the DB matches the model (Python-side default only).
    op.add_column(
        'database_table_column',
        sa.Column('primary_key', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )
    op.alter_column('database_table_column', 'primary_key', server_default=None)


def downgrade() -> None:
    op.drop_column('database_table_column', 'primary_key')
