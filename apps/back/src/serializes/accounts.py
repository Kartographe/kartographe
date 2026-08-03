# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for accounts (workspaces)."""

import uuid
from datetime import datetime

from src.models.enum import (
    AccountStatus,
    AccountUserRole,
    AccountUserStatus,
    AccountUserType,
    ComplexityMode,
    Language,
)
from src.serializes._base import CamelBase


class AccountUserContextItem(CamelBase):
    """The requesting user's own membership context inside an account."""

    id: uuid.UUID
    role: AccountUserRole
    start_date: datetime | None = None
    status: AccountUserStatus
    type: AccountUserType


class AccountItem(CamelBase):
    """A workspace, with the caller's membership context when available."""

    created_date: datetime | None = None
    id: uuid.UUID
    language: Language
    membership: AccountUserContextItem | None = None
    name: str
    picture_profile: str | None = None
    product_complexity_mode: ComplexityMode
    status: AccountStatus
    status_date: datetime | None = None
    technical_complexity_mode: ComplexityMode
    time_zone: str
