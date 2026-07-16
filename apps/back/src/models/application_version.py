# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `application_version` table — a released version of an application."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, JSON, Integer
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import ApplicationStatus, ApplicationVersionType

if TYPE_CHECKING:
    from src.models.user import User


class ApplicationVersion(BaseModel, table=True):
    __tablename__ = "application_version"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    application_id: uuid.UUID = Field(foreign_key="application.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    type: ApplicationVersionType = Field(index=True)
    status: ApplicationStatus = Field(index=True)
    status_date: datetime
    title: str
    # Semantic version as an integer tuple, e.g. [1, 2, 3] for "1.2.3".
    version: list[int] = Field(sa_type=ARRAY(Integer))
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)

    owner: "User" = Relationship()
