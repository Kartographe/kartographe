# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for services and their actions."""

import uuid
from datetime import datetime

from src.models.enum import (
    ServiceActionMethod,
    ServiceActionStatus,
    ServiceActionType,
    ServiceStatus,
    ServiceType,
)
from src.serializes._base import CamelBase
from src.serializes.users import OwnerItem


class ServiceItem(CamelBase):
    """A service tracked inside an account."""

    comment_count: int = 0
    date: datetime
    description: dict | None = None
    id: uuid.UUID
    locked: bool
    locked_by: OwnerItem | None = None
    locked_by_id: uuid.UUID | None = None
    locked_date: datetime | None = None
    openapi_url: str | None = None
    owner: OwnerItem
    owner_id: uuid.UUID
    picture_path: str | None = None
    status: ServiceStatus
    status_date: datetime
    title: str
    type: ServiceType
    url: str | None = None


class ServiceActionItem(CamelBase):
    """An action exposed by a service."""

    comment_count: int = 0
    date: datetime
    description: dict | None = None
    id: uuid.UUID
    locked: bool
    locked_by: OwnerItem | None = None
    locked_by_id: uuid.UUID | None = None
    locked_date: datetime | None = None
    method: ServiceActionMethod | None = None
    owner: OwnerItem
    owner_id: uuid.UUID
    path: str | None = None
    status: ServiceActionStatus
    status_date: datetime
    title: str
    type: ServiceActionType
