# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for services and their actions."""

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import ServiceActionMethod, ServiceActionType, ServiceType

# --- Service -------------------------------------------------------------


class ServiceCreateForm(CamelBase):
    """Create a service. It starts as a draft owned by the caller."""

    type: ServiceType
    title: str = Field(min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    picture_path: str | None = Field(default=None, max_length=2048)
    url: str | None = Field(default=None, max_length=2048)
    openapi_url: str | None = Field(default=None, max_length=2048)


class ServicePatchForm(CamelBase):
    """Partial update of a service — only the keys sent are applied."""

    type: ServiceType | None = Field(default=None)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    picture_path: str | None = Field(default=None, max_length=2048)
    url: str | None = Field(default=None, max_length=2048)
    openapi_url: str | None = Field(default=None, max_length=2048)


# --- ServiceAction -------------------------------------------------------


class ServiceActionCreateForm(CamelBase):
    """Create a service action. It starts as a draft owned by the caller."""

    type: ServiceActionType
    title: str = Field(min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    method: ServiceActionMethod | None = Field(default=None)
    path: str | None = Field(default=None, max_length=2048)


class ServiceActionPatchForm(CamelBase):
    """Partial update of an action — only the keys sent are applied."""

    type: ServiceActionType | None = Field(default=None)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    method: ServiceActionMethod | None = Field(default=None)
    path: str | None = Field(default=None, max_length=2048)
