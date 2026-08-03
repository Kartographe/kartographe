# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for application components."""

import uuid

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import ApplicationComponentStatus, ApplicationComponentType


class ApplicationComponentCreateForm(CamelBase):
    """Create a component. It starts as a draft owned by the caller."""

    title: str = Field(min_length=1, max_length=255)
    type: ApplicationComponentType = Field(default=ApplicationComponentType.OTHER)
    description: dict | None = Field(default=None, description="Rich text (Tiptap JSON document).")
    tag_ids: list[uuid.UUID] = Field(default_factory=list)


class ApplicationComponentPatchForm(CamelBase):
    """Partial update of a component — only the keys sent are applied."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    type: ApplicationComponentType | None = Field(default=None)
    status: ApplicationComponentStatus | None = Field(default=None)
    description: dict | None = Field(default=None, description="Rich text (Tiptap JSON document).")
    tag_ids: list[uuid.UUID] | None = Field(default=None)


class ApplicationComponentDatabaseTableCreateForm(CamelBase):
    """Link a component to a database table. The table must belong to the account."""

    database_table_id: uuid.UUID
    description: dict | None = Field(
        default=None, description="Rich text (Tiptap JSON document) — what the component does with the table."
    )


class ApplicationComponentDatabaseTablePatchForm(CamelBase):
    """Partial update of a component/table link — only the keys sent are applied."""

    database_table_id: uuid.UUID | None = Field(default=None)
    description: dict | None = Field(default=None, description="Rich text (Tiptap JSON document).")
