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
    ServiceCategory,
    ServiceStatus,
    ServiceType,
    VoteRole,
    VoteValue,
)
from src.serializes._base import CamelBase, VotableItem
from src.serializes.users import OwnerItem


class ServiceItem(VotableItem):
    """A service tracked inside an account."""

    comment_count: int = 0
    votes_counts_by_value: dict[VoteValue, int] = {}
    votes_counts_by_role_value: dict[VoteRole, dict[VoteValue, int]] = {}
    category: ServiceCategory
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
    # Resolved public URL (built in `ServiceManager.to_item`), not the raw key.
    picture_path: str | None = None
    status: ServiceStatus
    status_date: datetime
    title: str
    type: ServiceType
    url: str | None = None


class ServiceActionItem(VotableItem):
    """An action exposed by a service."""

    comment_count: int = 0
    votes_counts_by_value: dict[VoteValue, int] = {}
    votes_counts_by_role_value: dict[VoteRole, dict[VoteValue, int]] = {}
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
