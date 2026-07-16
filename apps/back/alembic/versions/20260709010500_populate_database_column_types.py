# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""populate database column types

Seeds the global SQL column-type catalogue for PostgreSQL and MySQL. Data-only:
rows are inserted with server-generated ids/timestamps and removed by slug on
downgrade. The engine string literal casts implicitly to its Postgres enum type.

Revision ID: 20260709010500
Revises: 20260709010000
Create Date: 2026-07-09 01:05:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = '20260709010500'
down_revision: Union[str, None] = '20260709010000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (short name, label). slug is "<engine>.<name>".
_POSTGRESQL = [
    ("smallint", "SMALLINT"), ("integer", "INTEGER"), ("bigint", "BIGINT"),
    ("decimal", "DECIMAL"), ("numeric", "NUMERIC"), ("real", "REAL"),
    ("double_precision", "DOUBLE PRECISION"), ("smallserial", "SMALLSERIAL"),
    ("serial", "SERIAL"), ("bigserial", "BIGSERIAL"), ("money", "MONEY"),
    ("boolean", "BOOLEAN"), ("char", "CHAR"), ("varchar", "VARCHAR"),
    ("text", "TEXT"), ("bytea", "BYTEA"), ("date", "DATE"), ("time", "TIME"),
    ("timetz", "TIMETZ"), ("timestamp", "TIMESTAMP"), ("timestamptz", "TIMESTAMPTZ"),
    ("interval", "INTERVAL"), ("uuid", "UUID"), ("json", "JSON"), ("jsonb", "JSONB"),
    ("xml", "XML"), ("inet", "INET"), ("cidr", "CIDR"), ("macaddr", "MACADDR"),
    ("bit", "BIT"), ("varbit", "VARBIT"), ("point", "POINT"), ("line", "LINE"),
    ("polygon", "POLYGON"), ("tsvector", "TSVECTOR"), ("array", "ARRAY"),
]

_MYSQL = [
    ("tinyint", "TINYINT"), ("smallint", "SMALLINT"), ("mediumint", "MEDIUMINT"),
    ("int", "INT"), ("bigint", "BIGINT"), ("decimal", "DECIMAL"), ("float", "FLOAT"),
    ("double", "DOUBLE"), ("bit", "BIT"), ("boolean", "BOOLEAN"), ("date", "DATE"),
    ("datetime", "DATETIME"), ("timestamp", "TIMESTAMP"), ("time", "TIME"),
    ("year", "YEAR"), ("char", "CHAR"), ("varchar", "VARCHAR"), ("binary", "BINARY"),
    ("varbinary", "VARBINARY"), ("tinyblob", "TINYBLOB"), ("blob", "BLOB"),
    ("mediumblob", "MEDIUMBLOB"), ("longblob", "LONGBLOB"), ("tinytext", "TINYTEXT"),
    ("text", "TEXT"), ("mediumtext", "MEDIUMTEXT"), ("longtext", "LONGTEXT"),
    ("enum", "ENUM"), ("set", "SET"), ("json", "JSON"), ("geometry", "GEOMETRY"),
    ("point", "POINT"),
]


def _entries():
    for engine, rows in (("postgresql", _POSTGRESQL), ("mysql", _MYSQL)):
        for name, label in rows:
            yield engine, f"{engine}.{name}", label


def upgrade() -> None:
    values = ",\n".join(
        f"(gen_random_uuid(), true, '{engine}', '{slug}', '{label}')"
        for engine, slug, label in _entries()
    )
    op.execute(
        "INSERT INTO database_column_type (id, enabled, database_type, slug, label) VALUES\n" + values
    )


def downgrade() -> None:
    slugs = ", ".join(f"'{slug}'" for _, slug, _ in _entries())
    op.execute(f"DELETE FROM database_column_type WHERE slug IN ({slugs})")
