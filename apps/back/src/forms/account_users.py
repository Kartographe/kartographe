# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for account member management."""

from src.forms._base import CamelBase
from src.models.enum import AccountUserRole, VoteRole


class AccountUserPatchForm(CamelBase):
    """Update a member's account role and/or their voting role.

    Both fields are optional so either can be changed on its own; omitted fields
    are left untouched.
    """

    role: AccountUserRole | None = None
    vote_role: VoteRole | None = None
