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
from src.models.enum import EntityType, VoteRole, VoteValue
from src.models.vote import Vote

# Per-entity vote tallies: {value: n} and {role: {value: n}}.
VotesByValue = dict[VoteValue, int]
VotesByRoleValue = dict[VoteRole, dict[VoteValue, int]]


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


def vote_counts(
    session: Session, entity_type: EntityType, entity_ids: Sequence[uuid.UUID]
) -> tuple[dict[uuid.UUID, VotesByValue], dict[uuid.UUID, VotesByRoleValue]]:
    """Vote tallies per entity — both by value and by (role, value) — in one query.

    `by_value` sums across roles; `by_role_value` keeps the role breakdown. An
    entity absent from a map has no votes.
    """
    by_value: dict[uuid.UUID, VotesByValue] = {}
    by_role_value: dict[uuid.UUID, VotesByRoleValue] = {}
    if not entity_ids:
        return by_value, by_role_value

    rows = session.exec(
        select(Vote.entity_id, Vote.role, Vote.value, func.count(Vote.id))
        .where(
            Vote.entity_type == entity_type,
            Vote.entity_id.in_(entity_ids),
            Vote.enabled.is_(True),
        )
        .group_by(Vote.entity_id, Vote.role, Vote.value)
    ).all()
    for entity_id, role, value, count in rows:
        value_tally = by_value.setdefault(entity_id, {})
        value_tally[value] = value_tally.get(value, 0) + count
        role_tally = by_role_value.setdefault(entity_id, {}).setdefault(role, {})
        role_tally[value] = role_tally.get(value, 0) + count
    return by_value, by_role_value


def my_votes(
    session: Session,
    entity_type: EntityType,
    entity_ids: Sequence[uuid.UUID],
    user_id: uuid.UUID,
) -> dict[uuid.UUID, VoteValue]:
    """The caller's own live vote value per entity (absent when they didn't vote)."""
    if not entity_ids:
        return {}
    rows = session.exec(
        select(Vote.entity_id, Vote.value).where(
            Vote.entity_type == entity_type,
            Vote.entity_id.in_(entity_ids),
            Vote.owner_id == user_id,
            Vote.enabled.is_(True),
        )
    ).all()
    return {entity_id: value for entity_id, value in rows}


def enrich_items(
    session: Session,
    entity_type: EntityType,
    items: list,
    *,
    user_id: uuid.UUID | None = None,
) -> list:
    """Fill each item's aggregate-count fields in place, then return `items`.

    `items` are already-serialized schema objects carrying an `id`. Fields are
    set only when the item declares them, so the helper is safe across entity
    kinds with different field sets. `user_id` (the signed-in member) additionally
    fills `my_vote` — pass it on listings, omit it on single reads.
    """
    if not items:
        return items

    entity_ids = [item.id for item in items]
    comments = comment_counts(session, entity_type, entity_ids)
    votes_by_value, votes_by_role_value = vote_counts(session, entity_type, entity_ids)
    mine = my_votes(session, entity_type, entity_ids, user_id) if user_id else {}

    for item in items:
        fields = type(item).model_fields
        if "comment_count" in fields:
            item.comment_count = comments.get(item.id, 0)
        if "votes_counts_by_value" in fields:
            item.votes_counts_by_value = votes_by_value.get(item.id, {})
        if "votes_counts_by_role_value" in fields:
            item.votes_counts_by_role_value = votes_by_role_value.get(item.id, {})
        if "my_vote" in fields:
            item.my_vote = mine.get(item.id)

    return items


# Sentinel for the "not voted by me" filter value.
NOT_VOTED = "none"


def my_vote_filter(model: type, entity_type: EntityType, user_id: uuid.UUID, my_vote: str):
    """A listing condition on the caller's own vote.

    `my_vote` is a `VoteValue` (entities the caller voted that way) or `NOT_VOTED`
    (entities the caller has not voted on). Applied by every entity's listing so
    the front can filter "where I voted X" / "not yet voted".
    """
    voted = select(Vote.entity_id).where(
        Vote.entity_type == entity_type,
        Vote.owner_id == user_id,
        Vote.enabled.is_(True),
    )
    if my_vote == NOT_VOTED:
        return model.id.not_in(voted)
    return model.id.in_(voted.where(Vote.value == my_vote))
