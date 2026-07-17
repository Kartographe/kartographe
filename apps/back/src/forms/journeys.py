# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for journeys and their scenario/step/assertion tree."""

import uuid

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import (
    JourneyScenarioCriticity,
    JourneyScenarioStatus,
    JourneyScenarioStepAssertionStatus,
    JourneyScenarioStepFileType,
    JourneyScenarioType,
    JourneyStatus,
    JourneyType,
)

# --- Journey -------------------------------------------------------------


class JourneyCreateForm(CamelBase):
    """Create a journey. It starts as a draft owned by the caller."""

    type: JourneyType
    title: str = Field(min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    personas_ids: list[uuid.UUID] = Field(default_factory=list)
    tag_ids: list[uuid.UUID] = Field(default_factory=list)


class JourneyPatchForm(CamelBase):
    """Partial update of a journey — only the keys sent are applied."""

    status: JourneyStatus | None = Field(default=None)
    type: JourneyType | None = Field(default=None)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    personas_ids: list[uuid.UUID] | None = Field(default=None)
    tag_ids: list[uuid.UUID] | None = Field(default=None)


# --- JourneyScenario -----------------------------------------------------


class JourneyScenarioCreateForm(CamelBase):
    """Create a scenario. It starts as a draft owned by the caller."""

    type: JourneyScenarioType
    personas_ids: list[uuid.UUID] = Field(default_factory=list)
    title: str = Field(min_length=1, max_length=255)
    criticity: JourneyScenarioCriticity
    description: dict | None = Field(default=None)
    tag_ids: list[uuid.UUID] = Field(default_factory=list)


class JourneyScenarioPatchForm(CamelBase):
    """Partial update of a scenario — only the keys sent are applied."""

    status: JourneyScenarioStatus | None = Field(default=None)
    type: JourneyScenarioType | None = Field(default=None)
    personas_ids: list[uuid.UUID] | None = Field(default=None)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    criticity: JourneyScenarioCriticity | None = Field(default=None)
    description: dict | None = Field(default=None)
    tag_ids: list[uuid.UUID] | None = Field(default=None)


# --- JourneyScenarioStep -------------------------------------------------


class JourneyScenarioStepCreateForm(CamelBase):
    """Create a step inside a scenario."""

    parent_journey_scenario_step_id: uuid.UUID | None = Field(default=None)
    title: str = Field(min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    action_type_id: uuid.UUID | None = Field(default=None)
    optional: bool = Field(default=False)
    parameters: dict = Field(default_factory=dict)
    tag_ids: list[uuid.UUID] = Field(default_factory=list)


class JourneyScenarioStepPatchForm(CamelBase):
    """Partial update of a step — only the keys sent are applied."""

    parent_journey_scenario_step_id: uuid.UUID | None = Field(default=None)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    action_type_id: uuid.UUID | None = Field(default=None)
    optional: bool | None = Field(default=None)
    parameters: dict | None = Field(default=None)
    tag_ids: list[uuid.UUID] | None = Field(default=None)


# --- JourneyScenarioStepFile ---------------------------------------------


class JourneyScenarioStepFilePatchForm(CamelBase):
    """Partial update of a step file's metadata."""

    type: JourneyScenarioStepFileType | None = Field(default=None)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)


# --- JourneyScenarioStepAssertion ----------------------------------------


class JourneyScenarioStepAssertionCreateForm(CamelBase):
    """Attach an assertion to a step. Starts as a draft owned by the caller."""

    assertion_type_id: uuid.UUID
    parameters: dict = Field(default_factory=dict)


class JourneyScenarioStepAssertionPatchForm(CamelBase):
    """Partial update of an assertion — only the keys sent are applied."""

    status: JourneyScenarioStepAssertionStatus | None = Field(default=None)
    assertion_type_id: uuid.UUID | None = Field(default=None)
    parameters: dict | None = Field(default=None)


# --- FeatureJourney ------------------------------------------------------


class FeatureJourneyCreateForm(CamelBase):
    """Link an existing account journey to a feature."""

    journey_id: uuid.UUID = Field(description="An existing journey of the same account.")


class JourneyScenarioStepRouteCreateForm(CamelBase):
    """Link a scenario step to an application route of the same account."""

    application_id: uuid.UUID
    application_route_id: uuid.UUID
