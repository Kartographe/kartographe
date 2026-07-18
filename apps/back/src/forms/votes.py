# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for votes."""

import uuid

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import EntityType, VoteValue


class VoteUpsertForm(CamelBase):
    """Cast (or update) the caller's vote on an entity.

    Only the stance is provided; the vote's `role` is snapshotted server-side
    from the member's `vote_role`.
    """

    value: VoteValue = Field(description="The member's stance on the entity.")


class VoteCastForm(VoteUpsertForm):
    """Cast a vote on any entity through the account-wide endpoint.

    Same stance-only shape as the per-entity form, plus the polymorphic target
    (`entityType` + `entityId`) — validated server-side against the account.
    """

    entity_type: EntityType = Field(description="The kind of entity being voted on.")
    entity_id: uuid.UUID = Field(description="The id of the entity being voted on.")
