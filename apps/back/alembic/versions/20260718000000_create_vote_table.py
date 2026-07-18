# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""create vote table, add account_user.vote_role, centralize entity_type

Centralizes the polymorphic entity-type list under a single Postgres `entity_type`
enum (renamed from `comment_entity_type`) shared by comments and the new votes,
adds the members' `vote_role`, and creates the `vote` table.

Revision ID: 20260718000000
Revises: 20260715000000
Create Date: 2026-07-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '20260718000000'
down_revision: Union[str, None] = '20260715000000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The centralized entity-type values, in the order the Postgres enum already
# holds them (comment_entity_type → entity_type).
_ENTITY_TYPE_VALUES = (
    'feature', 'application', 'application_route', 'journey', 'persona', 'database',
    'database_table', 'database_table_column', 'database_migration',
    'database_migration_column', 'service', 'service_action', 'journey_scenario',
    'journey_scenario_step',
)
_VOTE_ROLE_VALUES = ('product_owner', 'developer', 'qa', 'data_analyst', 'other')
_VOTE_VALUE_VALUES = ('upvote', 'downvote', 'pending_question', 'dont_know')


def upgrade() -> None:
    # 1. Centralize the entity-type enum: comments and votes share it now.
    op.execute('ALTER TYPE comment_entity_type RENAME TO entity_type')

    # 2. Voting role — shared by account_user.vote_role and vote.role — and the
    #    vote stance. Created up front so both columns can reference them.
    op.execute(f"CREATE TYPE vote_role AS ENUM {_VOTE_ROLE_VALUES!r}".replace('"', "'"))
    op.execute(f"CREATE TYPE vote_value AS ENUM {_VOTE_VALUE_VALUES!r}".replace('"', "'"))

    # 3. Every existing member gets the default voting role.
    op.add_column(
        'account_user',
        sa.Column(
            'vote_role',
            postgresql.ENUM(*_VOTE_ROLE_VALUES, name='vote_role', create_type=False),
            nullable=False,
            server_default='other',
        ),
    )
    op.alter_column('account_user', 'vote_role', server_default=None)

    # 4. The vote table.
    op.create_table(
        'vote',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('account_id', sa.Uuid(), nullable=False),
        sa.Column('owner_id', sa.Uuid(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        # `entity_type` already exists (shared with `comment`); reference it
        # without re-creating it.
        sa.Column('entity_type', postgresql.ENUM(*_ENTITY_TYPE_VALUES, name='entity_type', create_type=False), nullable=False),
        sa.Column('entity_id', sa.Uuid(), nullable=False),
        sa.Column('role', postgresql.ENUM(*_VOTE_ROLE_VALUES, name='vote_role', create_type=False), nullable=False),
        sa.Column('value', postgresql.ENUM(*_VOTE_VALUE_VALUES, name='vote_value', create_type=False), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['account.id'], ),
        sa.ForeignKeyConstraint(['owner_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_vote_account_id'), 'vote', ['account_id'], unique=False)
    op.create_index(op.f('ix_vote_entity_id'), 'vote', ['entity_id'], unique=False)
    op.create_index(op.f('ix_vote_entity_type'), 'vote', ['entity_type'], unique=False)
    op.create_index(op.f('ix_vote_owner_id'), 'vote', ['owner_id'], unique=False)
    op.create_index(op.f('ix_vote_value'), 'vote', ['value'], unique=False)
    # At most one live vote per member and entity.
    op.create_index(
        'unique_vote_active',
        'vote',
        ['account_id', 'entity_type', 'entity_id', 'owner_id'],
        unique=True,
        postgresql_where=sa.text('enabled'),
    )


def downgrade() -> None:
    op.drop_index('unique_vote_active', table_name='vote')
    op.drop_index(op.f('ix_vote_value'), table_name='vote')
    op.drop_index(op.f('ix_vote_owner_id'), table_name='vote')
    op.drop_index(op.f('ix_vote_entity_type'), table_name='vote')
    op.drop_index(op.f('ix_vote_entity_id'), table_name='vote')
    op.drop_index(op.f('ix_vote_account_id'), table_name='vote')
    op.drop_table('vote')
    op.drop_column('account_user', 'vote_role')
    op.execute('DROP TYPE IF EXISTS vote_value')
    op.execute('DROP TYPE IF EXISTS vote_role')
    op.execute('ALTER TYPE entity_type RENAME TO comment_entity_type')
