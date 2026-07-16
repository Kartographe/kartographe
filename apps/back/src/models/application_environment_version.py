# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `application_environment_version` table — a version deployed to an
environment (a deployment record)."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import ApplicationEnvironmentVersionStatus

if TYPE_CHECKING:
    from src.models.user import User


class ApplicationEnvironmentVersion(BaseModel, table=True):
    __tablename__ = "application_environment_version"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    application_id: uuid.UUID = Field(foreign_key="application.id", index=True)
    application_environment_id: uuid.UUID = Field(
        foreign_key="application_environment.id", index=True
    )
    application_version_id: uuid.UUID = Field(foreign_key="application_version.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    status: ApplicationEnvironmentVersionStatus = Field(index=True)
    status_date: datetime
    status_details: str | None = Field(default=None)

    owner: "User" = Relationship()
