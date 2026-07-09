"""The `application` table — an application tracked inside an account."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, Uuid
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import ApplicationStatus, ApplicationType

if TYPE_CHECKING:
    from src.models.user import User


class Application(BaseModel, table=True):
    __tablename__ = "application"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    title: str
    description: str | None = Field(default=None)
    type: ApplicationType = Field(index=True)
    status: ApplicationStatus = Field(index=True)
    status_date: datetime
    tag_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))

    owner: "User" = Relationship()
