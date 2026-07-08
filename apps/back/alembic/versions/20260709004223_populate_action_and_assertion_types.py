"""populate action and assertion types

Seeds the global reference catalogues. Data-only migration: rows are inserted
with server-generated ids/timestamps and removed by slug on downgrade. String
literals cast implicitly to their Postgres enum type; JSON is cast explicitly.

Revision ID: 20260709004223
Revises: 20260708224056
Create Date: 2026-07-09 00:42:23.287224

"""
from typing import Sequence, Union

from alembic import op

revision: str = '20260709004223'
down_revision: Union[str, None] = '20260708224056'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (type, slug, label, parameter_schema)
_ACTION_TYPES = [
    ("navigate", "navigate.navigate", "Navigate", '{"url": "string"}'),
    ("navigate", "navigate.click", "Click", '{"selector": "string"}'),
    ("navigate", "navigate.wait", "Wait", '{"time_ms": "int"}'),
    ("form", "form.fill", "Fill Form", '{"fields": "dict"}'),
    ("form", "form.input_type", "Input Type", '{"selector": "string", "value": "string"}'),
    ("form", "form.select", "Select", '{"selector": "string", "value": "string"}'),
    ("form", "form.upload_file", "Upload File", '{"selector": "string", "value": "file"}'),
    ("form", "form.download", "Download", '{}'),
    ("form", "form.submit", "Submit", '{"selector": "string"}'),
]

_ASSERTION_TYPES = [
    ("browser", "browser.url", "URL", '{"url": "string"}'),
]


def _rows(entries) -> str:
    parts = []
    for type_, slug, label, schema in entries:
        label_sql = label.replace("'", "''")
        schema_sql = schema.replace("'", "''")
        parts.append(
            f"(gen_random_uuid(), true, '{type_}', '{slug}', '{label_sql}', '{schema_sql}'::json)"
        )
    return ",\n".join(parts)


def upgrade() -> None:
    op.execute(
        "INSERT INTO action_type (id, enabled, type, slug, label, parameter_schema) VALUES\n"
        + _rows(_ACTION_TYPES)
    )
    op.execute(
        "INSERT INTO assertion_type (id, enabled, type, slug, label, parameter_schema) VALUES\n"
        + _rows(_ASSERTION_TYPES)
    )


def downgrade() -> None:
    action_slugs = ", ".join(f"'{slug}'" for _, slug, _, _ in _ACTION_TYPES)
    assertion_slugs = ", ".join(f"'{slug}'" for _, slug, _, _ in _ASSERTION_TYPES)
    op.execute(f"DELETE FROM action_type WHERE slug IN ({action_slugs})")
    op.execute(f"DELETE FROM assertion_type WHERE slug IN ({assertion_slugs})")
