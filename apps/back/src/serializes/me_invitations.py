# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for the recipient-side invitations (`/me/invitations`)."""

import uuid
from datetime import datetime

from src.models.enum import AccountUserInvitationStatus, AccountUserInvitationType, AccountUserRole
from src.serializes._base import CamelBase


class MeInvitationAccountItem(CamelBase):
    """The account the invitation grants access to."""

    id: uuid.UUID
    name: str


class MeInvitationOwnerItem(CamelBase):
    """Who sent the invitation (display name only)."""

    id: uuid.UUID
    name: str | None = None


class MeInvitationItem(CamelBase):
    """An invitation addressed to the signed-in user."""

    account: MeInvitationAccountItem
    date: datetime | None = None
    expire_date: datetime | None = None
    id: uuid.UUID
    owner: MeInvitationOwnerItem | None = None
    role: AccountUserRole
    status: AccountUserInvitationStatus
    status_date: datetime | None = None
    type: AccountUserInvitationType
