# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for account member management."""

from src.forms._base import CamelBase
from src.models.enum import AccountUserRole


class AccountUserPatchForm(CamelBase):
    """Change a member's role."""

    role: AccountUserRole
