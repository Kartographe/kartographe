"""rename mcp oauth tables/types to generic oauth

Renames the dynamically-registered OAuth authorization-server schema from the
`user_mcp_*` / `mcp_*` naming to a provider-neutral `oauth_*` naming, so the
MCP transport becomes just one consumer of a generic OAuth server (shared with
the browser-extension and future integrations). Pure rename — no data change.

Revision ID: 20260715000000
Revises: 20260710000000
Create Date: 2026-07-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = '20260715000000'
down_revision: Union[str, None] = '20260710000000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (old, new) pairs.
_TABLES = [
    ('user_mcp_client', 'oauth_client'),
    ('user_mcp_grant', 'oauth_grant'),
    ('user_mcp_authorization_request', 'oauth_authorization_request'),
]
_ENUM_TYPES = [
    ('mcp_grant_scope', 'oauth_grant_scope'),
    ('mcp_grant_status', 'oauth_grant_status'),
    ('mcp_authorization_flow_type', 'oauth_authorization_flow_type'),
    ('mcp_authorization_request_status', 'oauth_authorization_request_status'),
]
_INDEXES = [
    ('ix_user_mcp_grant_client_id', 'ix_oauth_grant_client_id'),
    ('ix_user_mcp_grant_scope', 'ix_oauth_grant_scope'),
    ('ix_user_mcp_grant_status', 'ix_oauth_grant_status'),
    ('ix_user_mcp_grant_user_id', 'ix_oauth_grant_user_id'),
    ('ix_user_mcp_authorization_request_authorization_code', 'ix_oauth_authorization_request_authorization_code'),
    ('ix_user_mcp_authorization_request_client_id', 'ix_oauth_authorization_request_client_id'),
    ('ix_user_mcp_authorization_request_device_code', 'ix_oauth_authorization_request_device_code'),
    ('ix_user_mcp_authorization_request_expires_at', 'ix_oauth_authorization_request_expires_at'),
    ('ix_user_mcp_authorization_request_flow_type', 'ix_oauth_authorization_request_flow_type'),
    ('ix_user_mcp_authorization_request_requested_scope', 'ix_oauth_authorization_request_requested_scope'),
    ('ix_user_mcp_authorization_request_status', 'ix_oauth_authorization_request_status'),
    ('ix_user_mcp_authorization_request_user_code', 'ix_oauth_authorization_request_user_code'),
    ('ix_user_mcp_authorization_request_user_id', 'ix_oauth_authorization_request_user_id'),
]
# (table, old_constraint, new_constraint) — renamed after the table is renamed.
_CONSTRAINTS = [
    ('oauth_client', 'user_mcp_client_pkey', 'oauth_client_pkey'),
    ('oauth_grant', 'user_mcp_grant_pkey', 'oauth_grant_pkey'),
    ('oauth_grant', 'user_mcp_grant_client_id_fkey', 'oauth_grant_client_id_fkey'),
    ('oauth_grant', 'user_mcp_grant_user_id_fkey', 'oauth_grant_user_id_fkey'),
    ('oauth_authorization_request', 'user_mcp_authorization_request_pkey', 'oauth_authorization_request_pkey'),
    ('oauth_authorization_request', 'user_mcp_authorization_request_client_id_fkey', 'oauth_authorization_request_client_id_fkey'),
    ('oauth_authorization_request', 'user_mcp_authorization_request_user_id_fkey', 'oauth_authorization_request_user_id_fkey'),
]


def _rename(pairs, template):
    for old, new in pairs:
        op.execute(template.format(old=old, new=new))


def upgrade() -> None:
    _rename(_ENUM_TYPES, 'ALTER TYPE {old} RENAME TO {new}')
    _rename(_TABLES, 'ALTER TABLE {old} RENAME TO {new}')
    _rename(_INDEXES, 'ALTER INDEX {old} RENAME TO {new}')
    for table, old, new in _CONSTRAINTS:
        op.execute(f'ALTER TABLE {table} RENAME CONSTRAINT {old} TO {new}')


def downgrade() -> None:
    for table, old, new in reversed(_CONSTRAINTS):
        # `table` is the new name; constraints live on it regardless of direction.
        op.execute(f'ALTER TABLE {table} RENAME CONSTRAINT {new} TO {old}')
    _rename([(new, old) for old, new in _INDEXES], 'ALTER INDEX {old} RENAME TO {new}')
    _rename([(new, old) for old, new in _TABLES], 'ALTER TABLE {old} RENAME TO {new}')
    _rename([(new, old) for old, new in _ENUM_TYPES], 'ALTER TYPE {old} RENAME TO {new}')
