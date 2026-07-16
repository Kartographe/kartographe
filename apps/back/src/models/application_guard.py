# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `application_guard` table — an authentication guard for an application.

Describes where and how a credential is carried on a request (bearer header,
basic auth, a token header or a query token), so routes can reference it.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, Uuid
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import (
    ApplicationGuardFieldFormat,
    ApplicationGuardFieldType,
    ApplicationGuardStatus,
    ApplicationGuardType,
)

if TYPE_CHECKING:
    from src.models.user import User


class ApplicationGuard(BaseModel, table=True):
    __tablename__ = "application_guard"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    application_id: uuid.UUID = Field(foreign_key="application.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    type: ApplicationGuardType = Field(index=True)
    status: ApplicationGuardStatus = Field(index=True)
    status_date: datetime
    title: str
    field_type: ApplicationGuardFieldType = Field(index=True)
    field_key: str
    field_format: ApplicationGuardFieldFormat | None = Field(default=None)
    tag_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))

    owner: "User" = Relationship()
