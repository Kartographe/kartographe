# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for features and their attached files."""

import uuid

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import (
    FeatureFileType,
    FeatureStatus,
    FeatureType,
)

# --- Feature -------------------------------------------------------------


class FeatureCreateForm(CamelBase):
    """Create a feature. It starts as a draft owned by the caller."""

    title: str = Field(min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    type: FeatureType
    tag_ids: list[uuid.UUID] = Field(default_factory=list)


class FeaturePatchForm(CamelBase):
    """Partial update of a feature — only the keys sent are applied."""

    status: FeatureStatus | None = Field(default=None)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)
    type: FeatureType | None = Field(default=None)
    tag_ids: list[uuid.UUID] | None = Field(default=None)


# --- FeatureFile ---------------------------------------------------------


class FeatureFilePatchForm(CamelBase):
    """Partial update of a file's metadata — its type, name and/or description.

    The binary content itself is immutable once uploaded.
    """

    type: FeatureFileType | None = Field(default=None)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)
