# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `application_environment` table — a deployment environment of an app."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import ApplicationEnvironmentType, ApplicationStatus

if TYPE_CHECKING:
    from src.models.user import User


class ApplicationEnvironment(BaseModel, table=True):
    __tablename__ = "application_environment"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    application_id: uuid.UUID = Field(foreign_key="application.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    type: ApplicationEnvironmentType = Field(index=True)
    status: ApplicationStatus = Field(index=True)
    status_date: datetime
    title: str
    # Rich-text (Tiptap JSON document).
    description: dict = Field(sa_type=JSON)
    url: str | None = Field(default=None)
    openapi_url: str | None = Field(default=None)

    owner: "User" = Relationship()
