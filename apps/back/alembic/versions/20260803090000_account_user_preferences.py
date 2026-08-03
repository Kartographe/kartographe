# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""account user preferences

Revision ID: 20260803090000
Revises: 20260719212521
Create Date: 2026-08-03 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20260803090000'
down_revision: Union[str, None] = '20260719212521'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing seats get an empty object, so the column can be NOT NULL from the
    # start and readers never have to handle `None`.
    op.add_column(
        'account_user',
        sa.Column('preferences', sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )


def downgrade() -> None:
    op.drop_column('account_user', 'preferences')
