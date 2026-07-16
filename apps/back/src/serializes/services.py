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


class ServiceItem(CamelBase):
    """A service tracked inside an account."""

    date: datetime
    description: dict | None = None
    id: uuid.UUID
    openapi_url: str | None = None
    owner_id: uuid.UUID
    picture_path: str | None = None
    status: ServiceStatus
    status_date: datetime
    title: str
    type: ServiceType
    url: str | None = None


class ServiceActionItem(CamelBase):
    """An action exposed by a service."""

    date: datetime
    description: dict | None = None
    id: uuid.UUID
    method: ServiceActionMethod | None = None
    owner_id: uuid.UUID
    path: str | None = None
    status: ServiceActionStatus
    status_date: datetime
    title: str
    type: ServiceActionType
