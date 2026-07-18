# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Display-ready pointers to a polymorphic account entity.

Shared by every feature that attaches to entities by (`entity_type`,
`entity_id`) — comments and votes today. `resolve_entity_refs`
(`src/managers/entity_ref.py`) builds these from the targeted rows.
"""

import uuid

from src.models.enum import EntityType
from src.serializes._base import CamelBase


class EntityNode(CamelBase):
    """One entity in a breadcrumb: what it is, and how to name it."""

    id: uuid.UUID
    type: EntityType
    label: str


class EntityRef(EntityNode):
    """A display-ready pointer to the entity something is attached to.

    `label` is derived per type (a title, a name, or `METHOD /path`). `parents`
    lists the containing entities, outermost first, so a column named `email`
    can be told apart from another one: `[database, table]` for the column.

    Deliberately flat rather than a self-referencing `parent`: `fastapi-mcp`
    inlines every `$ref` when it converts the OpenAPI spec into MCP tools, so a
    recursive schema blows the stack at app boot.
    """

    parents: list[EntityNode] = []
