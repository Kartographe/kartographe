# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for applications and their environments, versions and
deployments."""

import uuid
from datetime import datetime

from src.models.enum import (
    ApplicationEnvironmentType,
    ApplicationEnvironmentVersionStatus,
    ApplicationStatus,
    ApplicationType,
    ApplicationVersionType,
    VoteRole,
    VoteValue,
)
from src.serializes._base import CamelBase, TaggableItem
from src.serializes.tags import TagItem
from src.serializes.users import OwnerItem


class ApplicationItem(TaggableItem):
    """An application tracked inside an account."""

    comment_count: int = 0
    votes_counts_by_value: dict[VoteValue, int] = {}
    votes_counts_by_role_value: dict[VoteRole, dict[VoteValue, int]] = {}
    date: datetime
    description: str | None = None
    id: uuid.UUID
    locked: bool
    locked_by: OwnerItem | None = None
    locked_by_id: uuid.UUID | None = None
    locked_date: datetime | None = None
    owner: OwnerItem
    owner_id: uuid.UUID
    status: ApplicationStatus
    status_date: datetime
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    title: str
    type: ApplicationType


class ApplicationEnvironmentItem(CamelBase):
    """A deployment environment of an application."""

    date: datetime
    description: dict
    id: uuid.UUID
    openapi_url: str | None = None
    owner: OwnerItem
    owner_id: uuid.UUID
    status: ApplicationStatus
    status_date: datetime
    title: str
    type: ApplicationEnvironmentType
    url: str | None = None


class ApplicationVersionItem(CamelBase):
    """A released version of an application (semantic version as an int tuple)."""

    date: datetime
    description: dict | None = None
    id: uuid.UUID
    owner: OwnerItem
    owner_id: uuid.UUID
    status: ApplicationStatus
    status_date: datetime
    title: str
    type: ApplicationVersionType
    version: list[int]


class ApplicationEnvironmentVersionItem(CamelBase):
    """A version deployed onto an environment (a deployment record)."""

    application_version_id: uuid.UUID
    date: datetime
    id: uuid.UUID
    owner: OwnerItem
    owner_id: uuid.UUID
    status: ApplicationEnvironmentVersionStatus
    status_date: datetime
    status_details: str | None = None


class ApplicationFeatureItem(CamelBase):
    """A feature attached to an application, with its presence window."""

    date: datetime
    end_application_version_id: uuid.UUID | None = None
    end_date: datetime | None = None
    feature_id: uuid.UUID
    id: uuid.UUID
    owner: OwnerItem
    owner_id: uuid.UUID
    start_application_version_id: uuid.UUID | None = None
    start_date: datetime | None = None
