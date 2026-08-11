# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for account-level features and their attached files."""

import uuid
from datetime import datetime

from src.models.enum import (
    FeatureFileStatus,
    FeatureFileType,
    FeatureStatus,
    FeatureType,
    VoteRole,
    VoteValue,
)
from src.serializes._base import CamelBase, EstimableItem, TaggableItem, VotableItem
from src.serializes.tags import TagItem
from src.serializes.users import OwnerItem


class FeatureRef(CamelBase):
    """A feature as seen from something that links to it.

    Carried by the link rows themselves so a listing of links is displayable on
    its own — without the reader having to fetch the account's features and
    join client-side, which silently breaks past the first page.
    """

    id: uuid.UUID
    status: FeatureStatus
    title: str
    type: FeatureType


class FeatureItem(TaggableItem, VotableItem, EstimableItem):
    """A feature tracked at the account level."""

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
    owner: OwnerItem
    owner_id: uuid.UUID
    status: FeatureStatus
    status_date: datetime
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    title: str
    type: FeatureType


class FeatureFileItem(CamelBase):
    """A file attached to a feature (screenshot, video, document, …).

    `download_url` is a time-limited link on object storage, or the direct path
    on local storage — resolved by the manager, only on the single-file read.
    """

    application_id: uuid.UUID | None = None
    date: datetime
    description: dict | None = None
    download_url: str | None = None
    file_extension: str
    file_name: str
    file_size: int
    id: uuid.UUID
    name: str
    owner: OwnerItem
    owner_id: uuid.UUID
    status: FeatureFileStatus
    status_date: datetime
    type: FeatureFileType
