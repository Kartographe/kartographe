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
)
from src.serializes._base import CamelBase
from src.serializes.tags import TagItem
from src.serializes.users import OwnerItem


class JourneyItem(CamelBase):
    """A user journey tracked inside an account."""

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


class JourneyScenarioItem(CamelBase):
    """A scenario inside a journey."""

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


class JourneyScenarioStepItem(CamelBase):
    """A step inside a scenario (nodes form a tree via `parentId`)."""

    action_type_id: uuid.UUID | None = None
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
    """A journey linked to a feature."""

    date: datetime
    id: uuid.UUID
    journey_id: uuid.UUID
    owner: OwnerItem
    owner_id: uuid.UUID


class JourneyScenarioStepRouteItem(CamelBase):
    """An application route linked to a scenario step."""

    application_id: uuid.UUID
    application_route_id: uuid.UUID
    date: datetime
    id: uuid.UUID
    owner: OwnerItem
    owner_id: uuid.UUID
