# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlmodel import Field, SQLModel

# Side-effect import: patches SQLAlchemy's Enum to use snake_case PG type names
# and store member values. Must run before any table class is defined.
import src.models._enum_type  # noqa: F401,E402  (import-for-side-effect)


def uuid7() -> uuid.UUID:
    """Time-ordered UUIDv7 (RFC 9562), native to Python 3.14's `uuid` module.

    Used as the primary-key generator so ids sort chronologically — far
    friendlier for B-tree indexes than random UUIDv4.
    """
    return uuid.uuid7()


class BaseModel(SQLModel):
    """Columns shared by every table.

    Not a table itself (`table=False`) — concrete models subclass it and add
    `table=True`. The column order here is mirrored by the Alembic autogenerate
    hook so migrations stay stable: `id`, `enabled`, then the timestamps.

    The timestamp columns use `sa_type` + `sa_column_kwargs` rather than a
    shared `sa_column=Column(...)`: a single `Column` instance cannot be
    attached to more than one table, so sharing one across every subclass raises
    "Column already assigned to Table". Passing kwargs makes SQLModel build a
    fresh `Column` per model.
    """

    id: uuid.UUID = Field(default_factory=uuid7, primary_key=True)
    enabled: bool = Field(default=True)

    created_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now(), "nullable": False},
    )
    updated_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now(), "onupdate": func.now(), "nullable": False},
    )
    deleted_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
    )
