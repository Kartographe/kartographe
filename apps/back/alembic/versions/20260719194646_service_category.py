# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""service category

Revision ID: 20260719194646
Revises: 20260718123000
Create Date: 2026-07-19 21:46:46.613700

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


revision: str = '20260719194646'
down_revision: Union[str, None] = '20260718123000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


service_category = sa.Enum(
    'payment', 'communication', 'automation', 'contractualization', 'authentication',
    'storage', 'analytics', 'messaging', 'monitoring', 'hosting', 'database', 'other',
    name='service_category',
)


def upgrade() -> None:
    # ADD COLUMN on an existing table does not create the PG enum type on its
    # own, so create it explicitly first. server_default backfills existing rows.
    service_category.create(op.get_bind(), checkfirst=True)
    op.add_column('service', sa.Column('category', service_category, server_default='other', nullable=False))
    op.create_index(op.f('ix_service_category'), 'service', ['category'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_service_category'), table_name='service')
    op.drop_column('service', 'category')
    service_category.drop(op.get_bind(), checkfirst=True)
