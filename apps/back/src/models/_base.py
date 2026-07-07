import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, func
from sqlmodel import Field, SQLModel


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
    """

    id: uuid.UUID = Field(default_factory=uuid7, primary_key=True)
    enabled: bool = Field(default=True)

    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )
    updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False),
    )
    deleted_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
