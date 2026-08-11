# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for journeys and their scenario/step/assertion tree."""

import uuid
from datetime import datetime

from src.models.enum import (
    JourneyScenarioCriticity,
    JourneyScenarioStatus,
    JourneyScenarioStepAssertionStatus,
    JourneyScenarioStepFileStatus,
    JourneyScenarioStepFileType,
    JourneyScenarioType,
    JourneyStatus,
    JourneyType,
    VoteRole,
    VoteValue,
)
from src.serializes._base import CamelBase, EstimableItem, TaggableItem, VotableItem
from src.serializes.application_routes import ApplicationRouteRef
from src.serializes.features import FeatureRef
from src.serializes.tags import TagItem
from src.serializes.users import OwnerItem


class JourneyRef(CamelBase):
    """A journey as seen from something that links to it.

    Carried by the link rows themselves so a listing of links is displayable on
    its own — without the reader having to fetch the account's journeys and
    join client-side, which silently breaks past the first page.
    """

    id: uuid.UUID
    status: JourneyStatus
    title: str
    type: JourneyType


class JourneyItem(TaggableItem, VotableItem, EstimableItem):
    """A user journey tracked inside an account."""

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
    personas_ids: list[uuid.UUID]
    status: JourneyStatus
    status_date: datetime
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    title: str
    type: JourneyType


class JourneyScenarioItem(TaggableItem, VotableItem, EstimableItem):
    """A scenario inside a journey."""

    comment_count: int = 0
    votes_counts_by_value: dict[VoteValue, int] = {}
    votes_counts_by_role_value: dict[VoteRole, dict[VoteValue, int]] = {}
    criticity: JourneyScenarioCriticity
    date: datetime
    description: dict | None = None
    id: uuid.UUID
    locked: bool
    locked_by: OwnerItem | None = None
    locked_by_id: uuid.UUID | None = None
    locked_date: datetime | None = None
    owner: OwnerItem
    owner_id: uuid.UUID
    personas_ids: list[uuid.UUID]
    status: JourneyScenarioStatus
    status_date: datetime
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    title: str
    type: JourneyScenarioType


class JourneyScenarioListItem(JourneyScenarioItem):
    """A scenario in the account-wide listing, carrying its parent journey.

    `journeyTitle` is null when the parent journey has since been removed.
    """

    journey_id: uuid.UUID
    journey_title: str | None = None


class JourneyScenarioStepItem(TaggableItem, VotableItem, EstimableItem):
    """A step inside a scenario (nodes form a tree via `parentId`)."""

    action_type_id: uuid.UUID | None = None
    comment_count: int = 0
    votes_counts_by_value: dict[VoteValue, int] = {}
    votes_counts_by_role_value: dict[VoteRole, dict[VoteValue, int]] = {}
    description: dict | None = None
    id: uuid.UUID
    locked: bool
    locked_by: OwnerItem | None = None
    locked_by_id: uuid.UUID | None = None
    locked_date: datetime | None = None
    optional: bool
    parameters: dict
    parent_journey_scenario_step_id: uuid.UUID | None = None
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    title: str


class JourneyScenarioStepFileItem(CamelBase):
    """A file attached to a step.

    `download_url` is a time-limited link, resolved by the manager only on the
    single-file read.
    """

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
    status: JourneyScenarioStepFileStatus
    status_date: datetime
    type: JourneyScenarioStepFileType


class JourneyScenarioStepAssertionItem(CamelBase):
    """An assertion carried by a step."""

    assertion_type_id: uuid.UUID
    date: datetime
    id: uuid.UUID
    owner: OwnerItem
    owner_id: uuid.UUID
    parameters: dict
    status: JourneyScenarioStepAssertionStatus
    status_date: datetime


class FeatureJourneyItem(CamelBase):
    """A journey linked to a feature.

    `journey` repeats what `journeyId` points at, so the link is displayable
    without a second call.
    """

    date: datetime
    id: uuid.UUID
    journey: JourneyRef
    journey_id: uuid.UUID
    owner: OwnerItem
    owner_id: uuid.UUID


class JourneyFeatureItem(CamelBase):
    """A feature linked to a journey — the same link row, seen from the journey.

    `feature` repeats what `featureId` points at, so the link is displayable
    without a second call.
    """

    date: datetime
    feature: FeatureRef
    feature_id: uuid.UUID
    id: uuid.UUID
    owner: OwnerItem
    owner_id: uuid.UUID


class JourneyScenarioStepRouteItem(CamelBase):
    """An application route linked to a scenario step.

    `route` repeats what `applicationRouteId` points at, so the link is
    displayable without a second call.
    """

    application_id: uuid.UUID
    application_route_id: uuid.UUID
    date: datetime
    id: uuid.UUID
    owner: OwnerItem
    owner_id: uuid.UUID
    route: ApplicationRouteRef
