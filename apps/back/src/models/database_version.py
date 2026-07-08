"""The `database_version` table — a version of a database's schema.

Activating a version archives the previously active one (stamping its
`end_date`) so at most one version is active at a time.
"""

import uuid
from datetime import datetime

from sqlalchemy import ARRAY, Integer
from sqlmodel import Field

from src.models._base import BaseModel
from src.models.enum import DatabaseVersionStatus


class DatabaseVersion(BaseModel, table=True):
    __tablename__ = "database_version"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    database_id: uuid.UUID = Field(foreign_key="database.id", index=True)

    date: datetime
    status: DatabaseVersionStatus = Field(index=True)
    # Semantic version as an integer tuple, e.g. [1, 2, 3] for "1.2.3".
    version: list[int] = Field(sa_type=ARRAY(Integer))
    start_date: datetime | None = Field(default=None)
    end_date: datetime | None = Field(default=None)
