# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `database_column_type` table — global catalogue of SQL column types.

Reference data (not account-scoped), seeded by a data migration. Each row is a
column type available for a given engine. The `slug` is unique and prefixed by
the engine (e.g. `postgresql.integer`, `mysql.varchar`).
"""

from sqlmodel import Field

from src.models._base import BaseModel
from src.models.enum import DatabaseType


class DatabaseColumnType(BaseModel, table=True):
    __tablename__ = "database_column_type"

    database_type: DatabaseType = Field(index=True)
    slug: str = Field(unique=True, index=True)
    label: str
