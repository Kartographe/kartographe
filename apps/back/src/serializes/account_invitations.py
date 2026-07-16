# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for account-side invitations."""

import uuid
from datetime import datetime

from src.models.enum import AccountUserInvitationStatus, AccountUserInvitationType, AccountUserRole
from src.serializes._base import CamelBase


class AccountInvitationOwnerItem(CamelBase):
    """The member who sent the invitation."""

    first_name: str | None = None
    id: uuid.UUID
    last_name: str | None = None
    picture_profile: str | None = None


class AccountInvitationItem(CamelBase):
    """A pending / resolved invitation, as seen from the account side."""

    date: datetime | None = None
    email: str
    expire_date: datetime | None = None
    id: uuid.UUID
    owner: AccountInvitationOwnerItem | None = None
    role: AccountUserRole
    status: AccountUserInvitationStatus
    status_date: datetime | None = None
    type: AccountUserInvitationType
