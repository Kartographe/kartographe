# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for application components."""

import uuid
from datetime import datetime

from src.models.enum import (
    ApplicationComponentStatus,
    ApplicationComponentType,
    VoteRole,
    VoteValue,
)
from src.serializes._base import TaggableItem, VotableItem
from src.serializes.tags import TagItem
from src.serializes.users import OwnerItem


class ApplicationComponentItem(TaggableItem, VotableItem):
    """A building block of an application."""

    application_id: uuid.UUID
    comment_count: int = 0
    date: datetime
    description: dict | None = None
    id: uuid.UUID
    locked: bool
    locked_by: OwnerItem | None = None
    locked_by_id: uuid.UUID | None = None
    locked_date: datetime | None = None
    owner: OwnerItem
    owner_id: uuid.UUID
    status: ApplicationComponentStatus
    status_date: datetime
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    title: str
    type: ApplicationComponentType
    votes_counts_by_role_value: dict[VoteRole, dict[VoteValue, int]] = {}
    votes_counts_by_value: dict[VoteValue, int] = {}


class ApplicationComponentListItem(ApplicationComponentItem):
    """A component in the account-wide listing, carrying its parent application.

    `applicationTitle` is null when the parent application has since been removed.
    """

    application_title: str | None = None
