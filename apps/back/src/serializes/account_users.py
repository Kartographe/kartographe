"""Output schemas for account members (seats)."""

import uuid
from datetime import datetime

from src.models.enum import AccountUserRole, AccountUserStatus, AccountUserType
from src.serializes._base import CamelBase


class AccountUserUserRefItem(CamelBase):
    """Minimal identity of the user behind a seat."""

    email: str
    first_name: str | None = None
    id: uuid.UUID
    last_name: str | None = None
    picture_profile: str | None = None


class AccountUserItem(CamelBase):
    """A member of an account."""

    end_date: datetime | None = None
    id: uuid.UUID
    role: AccountUserRole
    start_date: datetime | None = None
    status: AccountUserStatus
    type: AccountUserType
    user: AccountUserUserRefItem
