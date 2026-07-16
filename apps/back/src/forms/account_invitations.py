# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for account-side invitations."""

from pydantic import EmailStr, Field

from src.forms._base import CamelBase
from src.models.enum import AccountUserRole


class CreateAccountInvitationsForm(CamelBase):
    """Invite one or more emails to the account with a single role.

    Emails already pending on the account are silently skipped."""

    emails: list[EmailStr] = Field(min_length=1, max_length=100)
    role: AccountUserRole


class UpdateAccountInvitationForm(CamelBase):
    """Change a pending invitation's role."""

    role: AccountUserRole
