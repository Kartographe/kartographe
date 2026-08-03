# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""create application component database table link

Adds `application_component_database_table` — which database tables a component
of an application works with, with an optional rich-text note.

Revision ID: 20260803170000
Revises: 20260803160000
Create Date: 2026-08-03 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20260803170000'
down_revision: Union[str, None] = '20260803160000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'application_component_database_table',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('account_id', sa.Uuid(), nullable=False),
        sa.Column('application_id', sa.Uuid(), nullable=False),
        sa.Column('application_component_id', sa.Uuid(), nullable=False),
        sa.Column('database_table_id', sa.Uuid(), nullable=False),
        sa.Column('owner_id', sa.Uuid(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('description', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['account.id'], ),
        sa.ForeignKeyConstraint(['application_id'], ['application.id'], ),
        sa.ForeignKeyConstraint(['application_component_id'], ['application_component.id'], ),
        sa.ForeignKeyConstraint(['database_table_id'], ['database_table.id'], ),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_application_component_database_table_account_id'),
        'application_component_database_table', ['account_id'], unique=False,
    )
    op.create_index(
        op.f('ix_application_component_database_table_application_component_id'),
        'application_component_database_table', ['application_component_id'], unique=False,
    )
    op.create_index(
        op.f('ix_application_component_database_table_application_id'),
        'application_component_database_table', ['application_id'], unique=False,
    )
    op.create_index(
        op.f('ix_application_component_database_table_database_table_id'),
        'application_component_database_table', ['database_table_id'], unique=False,
    )
    op.create_index(
        op.f('ix_application_component_database_table_owner_id'),
        'application_component_database_table', ['owner_id'], unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f('ix_application_component_database_table_owner_id'),
        table_name='application_component_database_table',
    )
    op.drop_index(
        op.f('ix_application_component_database_table_database_table_id'),
        table_name='application_component_database_table',
    )
    op.drop_index(
        op.f('ix_application_component_database_table_application_id'),
        table_name='application_component_database_table',
    )
    op.drop_index(
        op.f('ix_application_component_database_table_application_component_id'),
        table_name='application_component_database_table',
    )
    op.drop_index(
        op.f('ix_application_component_database_table_account_id'),
        table_name='application_component_database_table',
    )
    op.drop_table('application_component_database_table')
