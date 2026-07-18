# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schema for votes."""

import uuid
from datetime import datetime

from src.models.enum import EntityType, VoteRole, VoteValue
from src.serializes._base import CamelBase
from src.serializes.entities import EntityRef
from src.serializes.users import OwnerItem


class VoteItem(CamelBase):
    """A member's vote on an account entity."""

    date: datetime
    entity_id: uuid.UUID
    entity_type: EntityType
    id: uuid.UUID
    owner: OwnerItem
    owner_id: uuid.UUID
    role: VoteRole
    value: VoteValue


class VoteListItem(VoteItem):
    """A vote enriched with its resolved entity.

    `entity` is null when the target has been soft-deleted — the vote still
    exists, its entity no longer does.
    """

    entity: EntityRef | None = None
