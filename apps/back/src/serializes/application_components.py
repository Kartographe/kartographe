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
from src.serializes._base import CamelBase, EstimableItem, TaggableItem, VotableItem
from src.serializes.tags import TagItem
from src.serializes.users import OwnerItem


class ApplicationComponentItem(TaggableItem, VotableItem, EstimableItem):
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


class ApplicationComponentDatabaseTableItem(CamelBase):
    """A link between a component and a database table.

    The table's own coordinates ride along: a table is only reachable through
    its database *and* version, so an id alone leaves a client unable to name
    what it points at. Null when the table has since been deleted.
    """

    application_component_id: uuid.UUID
    application_id: uuid.UUID
    database_id: uuid.UUID | None = None
    database_table_id: uuid.UUID
    database_table_name: str | None = None
    database_version_id: uuid.UUID | None = None
    date: datetime
    description: dict | None = None
    id: uuid.UUID
    owner: OwnerItem
    owner_id: uuid.UUID
