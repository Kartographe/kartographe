# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schema for comments."""

import uuid
from datetime import datetime

from src.models.enum import CommentEntityType, CommentStatus
from src.serializes._base import CamelBase


class CommentItem(CamelBase):
    """A threaded comment on an account entity."""

    date: datetime
    entity_id: uuid.UUID
    entity_type: CommentEntityType
    id: uuid.UUID
    owner_id: uuid.UUID
    parent_comment_id: uuid.UUID | None = None
    status: CommentStatus
    status_date: datetime
    value: dict | None = None


class CommentEntityNode(CamelBase):
    """One entity in a comment's breadcrumb: what it is, and how to name it."""

    id: uuid.UUID
    type: CommentEntityType
    label: str


class CommentEntityRef(CommentEntityNode):
    """A display-ready pointer to the entity a comment is attached to.

    `label` is derived per type (a title, a name, or `METHOD /path`). `parents`
    lists the containing entities, outermost first, so a column named `email`
    can be told apart from another one: `[database, table]` for the column.

    Deliberately flat rather than a self-referencing `parent`: `fastapi-mcp`
    inlines every `$ref` when it converts the OpenAPI spec into MCP tools, so a
    recursive schema blows the stack at app boot.
    """

    parents: list[CommentEntityNode] = []


class CommentListItem(CommentItem):
    """A comment enriched with its resolved entity.

    `entity` is null when the target has been soft-deleted — the comment still
    exists, its entity no longer does.
    """

    entity: CommentEntityRef | None = None
