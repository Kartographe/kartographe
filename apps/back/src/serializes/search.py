# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Full-text search result schemas.

Each hit carries its own kind (`entityType`/`entityId`) plus a `resource`: the
display-ready, navigable target the front links to — the matched entity itself,
or, for a comment hit, the commented entity (with its breadcrumb in
`resource.parents`). `excerpt` is set only for comment hits.
"""

import uuid

from src.models.enum import SearchEntityType
from src.serializes._base import CamelBase
from src.serializes.entities import EntityRef


class SearchResultItem(CamelBase):
    """One ranked search hit."""

    # The `search` index row id.
    id: uuid.UUID
    entity_type: SearchEntityType
    # The matched thing's id (the entity, or the comment for a comment hit).
    entity_id: uuid.UUID
    # `ts_rank` relevance score; higher is more relevant.
    score: float
    # Human label — the entity's, or the comment's excerpt for a comment hit.
    label: str
    # Text preview, set only for comment hits.
    excerpt: str | None = None
    # Where to go: the navigable entity with its containing breadcrumb.
    resource: EntityRef | None = None


class SearchCountsItem(CamelBase):
    """Match counts per entity type for a query — powers the result facets."""

    counts: dict[SearchEntityType, int]
    total: int
