# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Enrich serialized entity items with their polymorphic aggregate counts.

Comments and votes attach to an entity by (`entity_type`, `entity_id`) rather
than a foreign key, so an entity's "how many comments / votes" is a grouped
count over those tables. `enrich_items` computes them for a whole page in a
fixed number of queries (no N+1) and writes them onto the already-serialized
items in place — the same "attach after serialize" shape the tag manager uses.

Only fields the item actually declares are written, so the one helper serves the
14 commentable/votable entities and the 11 that also carry tags without the
serializers having to agree on a shared base.
"""

import uuid
from collections.abc import Sequence

from sqlmodel import Session, func, select

from src.models.comment import Comment
from src.models.enum import EntityType


def comment_counts(
    session: Session, entity_type: EntityType, entity_ids: Sequence[uuid.UUID]
) -> dict[uuid.UUID, int]:
    """Enabled comment count per entity id, in a single grouped query."""
    if not entity_ids:
        return {}
    rows = session.exec(
        select(Comment.entity_id, func.count(Comment.id))
        .where(
            Comment.entity_type == entity_type,
            Comment.entity_id.in_(entity_ids),
            Comment.enabled.is_(True),
        )
        .group_by(Comment.entity_id)
    ).all()
    return {entity_id: count for entity_id, count in rows}


def enrich_items(session: Session, entity_type: EntityType, items: list) -> list:
    """Fill each item's aggregate-count fields in place, then return `items`.

    `items` are already-serialized schema objects carrying an `id`. Fields are
    set only when the item declares them, so the helper is safe across entity
    kinds with different field sets.
    """
    if not items:
        return items

    entity_ids = [item.id for item in items]

    comments = comment_counts(session, entity_type, entity_ids)
    for item in items:
        if "comment_count" in type(item).model_fields:
            item.comment_count = comments.get(item.id, 0)

    return items
