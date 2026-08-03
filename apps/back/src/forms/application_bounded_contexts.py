# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for application bounded contexts."""

import uuid

from pydantic import Field

from src.forms._base import CamelBase

_COMPONENTS_DESCRIPTION = (
    "Components inside the boundary. Each must belong to the same application."
)


class ApplicationBoundedContextCreateForm(CamelBase):
    """Create a bounded context, owned by the caller."""

    title: str = Field(min_length=1, max_length=255)
    description: dict | None = Field(default=None, description="Rich text (Tiptap JSON document).")
    application_component_ids: list[uuid.UUID] = Field(
        default_factory=list, description=_COMPONENTS_DESCRIPTION
    )


class ApplicationBoundedContextPatchForm(CamelBase):
    """Partial update of a bounded context — only the keys sent are applied."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None, description="Rich text (Tiptap JSON document).")
    application_component_ids: list[uuid.UUID] | None = Field(
        default=None, description=_COMPONENTS_DESCRIPTION
    )
