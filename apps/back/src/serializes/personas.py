# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for personas (user archetypes)."""

import uuid
from datetime import datetime

from src.models.enum import PersonaStatus, PersonaType, VoteRole, VoteValue
from src.serializes._base import CamelBase, TaggableItem, VotableItem
from src.serializes.users import OwnerItem
from src.serializes.tags import TagItem


class PersonaItem(TaggableItem, VotableItem):
    """A persona tracked inside an account."""

    comment_count: int = 0
    votes_counts_by_value: dict[VoteValue, int] = {}
    votes_counts_by_role_value: dict[VoteRole, dict[VoteValue, int]] = {}
    date: datetime
    description: dict | None = None
    id: uuid.UUID
    locked: bool
    locked_by: OwnerItem | None = None
    locked_by_id: uuid.UUID | None = None
    locked_date: datetime | None = None
    status: PersonaStatus
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    title: str
    type: PersonaType
