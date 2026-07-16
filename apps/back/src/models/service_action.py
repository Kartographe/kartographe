# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `service_action` table — an action exposed by a service.

`method` and `path` describe the HTTP call when the action is an endpoint; both
are absent for non-HTTP actions (events, jobs, …).
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import ServiceActionMethod, ServiceActionStatus, ServiceActionType

if TYPE_CHECKING:
    from src.models.user import User


class ServiceAction(BaseModel, table=True):
    __tablename__ = "service_action"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    service_id: uuid.UUID = Field(foreign_key="service.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    type: ServiceActionType = Field(index=True)
    status: ServiceActionStatus = Field(index=True)
    status_date: datetime
    title: str
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
    method: ServiceActionMethod | None = Field(default=None, index=True)
    path: str | None = Field(default=None, index=True)

    owner: "User" = Relationship()
