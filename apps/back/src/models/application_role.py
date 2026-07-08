"""The `application_role` table — an authorization role of an application.

Named role that routes can require; carries a rich-text description.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import ApplicationRoleStatus

if TYPE_CHECKING:
    from src.models.user import User


class ApplicationRole(BaseModel, table=True):
    __tablename__ = "application_role"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    application_id: uuid.UUID = Field(foreign_key="application.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    status: ApplicationRoleStatus = Field(index=True)
    status_date: datetime
    title: str
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)

    owner: "User" = Relationship()
