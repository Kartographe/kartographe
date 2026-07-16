# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `service` table — a service tracked inside an account."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import ServiceStatus, ServiceType

if TYPE_CHECKING:
    from src.models.user import User


class Service(BaseModel, table=True):
    __tablename__ = "service"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    type: ServiceType = Field(index=True)
    status: ServiceStatus = Field(index=True)
    status_date: datetime
    title: str
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
    picture_path: str | None = Field(default=None)
    url: str | None = Field(default=None)
    openapi_url: str | None = Field(default=None)

    owner: "User" = Relationship()
