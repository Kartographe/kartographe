# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for application bounded contexts."""

import uuid
from datetime import datetime

from src.models.enum import VoteRole, VoteValue
from src.serializes._base import VotableItem
from src.serializes.users import OwnerItem


class ApplicationBoundedContextItem(VotableItem):
    """A bounded context of an application."""

    application_component_ids: list[uuid.UUID]
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
    title: str
    votes_counts_by_role_value: dict[VoteRole, dict[VoteValue, int]] = {}
    votes_counts_by_value: dict[VoteValue, int] = {}


class ApplicationBoundedContextListItem(ApplicationBoundedContextItem):
    """A bounded context in the account-wide listing, carrying its application.

    `applicationTitle` is null when the parent application has since been removed.
    """

    application_title: str | None = None
