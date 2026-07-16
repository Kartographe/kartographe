# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for applications, environments, versions and deployments."""

import uuid
from datetime import datetime

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import (
    ApplicationEnvironmentType,
    ApplicationEnvironmentVersionStatus,
    ApplicationType,
    ApplicationVersionType,
)

# --- Application ---------------------------------------------------------


class ApplicationCreateForm(CamelBase):
    """Create an application. It starts as a draft owned by the caller."""

    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    type: ApplicationType
    tag_ids: list[uuid.UUID] = Field(default_factory=list)


class ApplicationPatchForm(CamelBase):
    """Partial update of an application — only the keys sent are applied."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    type: ApplicationType | None = Field(default=None)
    tag_ids: list[uuid.UUID] | None = Field(default=None)


# --- ApplicationEnvironment ----------------------------------------------


class ApplicationEnvironmentCreateForm(CamelBase):
    """Create a deployment environment. It starts as a draft owned by the caller."""

    type: ApplicationEnvironmentType
    title: str = Field(min_length=1, max_length=255)
    description: dict = Field(description="Rich-text content as a document object.")
    url: str | None = Field(default=None, max_length=2048)
    openapi_url: str | None = Field(default=None, max_length=2048)


class ApplicationEnvironmentPatchForm(CamelBase):
    """Partial update of an environment — only the keys sent are applied."""

    type: ApplicationEnvironmentType | None = Field(default=None)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    url: str | None = Field(default=None, max_length=2048)
    openapi_url: str | None = Field(default=None, max_length=2048)


# --- ApplicationVersion --------------------------------------------------


class ApplicationVersionCreateForm(CamelBase):
    """Create a version. It starts as a draft owned by the caller."""

    type: ApplicationVersionType
    title: str = Field(min_length=1, max_length=255)
    version: list[int] = Field(min_length=1, max_length=4, description="Version tuple, e.g. [1, 2, 3].")
    description: dict | None = Field(default=None)


class ApplicationVersionPatchForm(CamelBase):
    """Partial update of a version — only the keys sent are applied."""

    type: ApplicationVersionType | None = Field(default=None)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    version: list[int] | None = Field(default=None, min_length=1, max_length=4)
    description: dict | None = Field(default=None)


# --- ApplicationEnvironmentVersion (deployment) --------------------------


class ApplicationEnvironmentVersionCreateForm(CamelBase):
    """Deploy a version onto an environment. Starts in the standby state."""

    application_version_id: uuid.UUID = Field(description="The version to deploy onto this environment.")


class ApplicationEnvironmentVersionPatchForm(CamelBase):
    """Partial update of a deployment — its state and/or details."""

    status: ApplicationEnvironmentVersionStatus | None = Field(default=None)
    status_details: str | None = Field(default=None, max_length=5000)


class ApplicationEnvironmentVersionErrorForm(CamelBase):
    """Mark a deployment as failed, with a required explanation."""

    status_details: str = Field(min_length=1, max_length=5000)


# --- ApplicationFeature --------------------------------------------------


class ApplicationFeatureCreateForm(CamelBase):
    """Attach an existing account feature to this application."""

    feature_id: uuid.UUID = Field(description="An existing feature of the same account.")


class ApplicationFeaturePatchForm(CamelBase):
    """Partial update of the feature's presence window on the application."""

    start_date: datetime | None = Field(default=None)
    start_application_version_id: uuid.UUID | None = Field(default=None)
    end_date: datetime | None = Field(default=None)
    end_application_version_id: uuid.UUID | None = Field(default=None)
