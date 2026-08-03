# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for account member management."""

from typing import Any

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import AccountUserRole, VoteRole


class AccountUserPatchForm(CamelBase):
    """Update a member's account role and/or their voting role.

    Both fields are optional so either can be changed on its own; omitted fields
    are left untouched.
    """

    role: AccountUserRole | None = None
    vote_role: VoteRole | None = None


class AccountUserPreferenceForm(CamelBase):
    """Set one preference entry of the caller's own seat.

    `value` is stored verbatim (any JSON value) under `key`; the other keys are
    left untouched. Sending `null` stores `null` for that key.
    """

    key: str = Field(min_length=1, max_length=120)
    value: Any = Field(
        default=None,
        description="Any JSON value — stored as-is under `key`.",
    )
