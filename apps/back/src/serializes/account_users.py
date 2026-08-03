# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for account members (seats)."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import Field

from src.models.enum import AccountUserRole, AccountUserStatus, AccountUserType, VoteRole
from src.serializes._base import CamelBase


class AccountUserUserRefItem(CamelBase):
    """Minimal identity of the user behind a seat."""

    email: str
    first_name: str | None = None
    id: uuid.UUID
    last_name: str | None = None
    picture_profile: str | None = None


_PREFERENCES_DESCRIPTION = (
    "Free-form UI preferences of this member on this account, one entry per view "
    '(e.g. `{"list:journeys": {"limit": 25, "sortBy": "date"}}`). Opaque to the API.'
)


class AccountUserMeItem(CamelBase):
    """The caller's own seat in an account, with their UI preferences."""

    id: uuid.UUID
    preferences: dict[str, Any] = Field(default_factory=dict, description=_PREFERENCES_DESCRIPTION)
    role: AccountUserRole
    start_date: datetime | None = None
    status: AccountUserStatus
    type: AccountUserType
    vote_role: VoteRole


class AccountUserPreferencesItem(CamelBase):
    """The full preference map of the caller's seat, after an update."""

    preferences: dict[str, Any] = Field(default_factory=dict, description=_PREFERENCES_DESCRIPTION)


class AccountUserItem(CamelBase):
    """A member of an account."""

    end_date: datetime | None = None
    id: uuid.UUID
    role: AccountUserRole
    start_date: datetime | None = None
    status: AccountUserStatus
    type: AccountUserType
    user: AccountUserUserRefItem
    vote_role: VoteRole
