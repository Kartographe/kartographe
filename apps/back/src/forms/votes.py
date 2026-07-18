# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for votes."""

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import VoteValue


class VoteUpsertForm(CamelBase):
    """Cast (or update) the caller's vote on an entity.

    Only the stance is provided; the vote's `role` is snapshotted server-side
    from the member's `vote_role`.
    """

    value: VoteValue = Field(description="The member's stance on the entity.")
