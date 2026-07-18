# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Full-text search over an account's `search` index.

Reads the Postgres `tsvector` index (never the source tables) to find matches,
ranks them with `ts_rank`, then resolves each hit back to a display-ready,
navigable entity via `resolve_entity_refs` — which also filters out anything
soft-deleted, so stale index rows silently disappear rather than erroring.

Comment hits are special: the index row points at the comment, but the result
must send the user to the *commented* entity. So a comment hit resolves its
target's `EntityRef` (with breadcrumb) as `resource`, and carries a text excerpt.
"""

import re
import uuid
from dataclasses import dataclass

from sqlmodel import func, select

from src.managers._base import BaseEntityManager
from src.managers.entity_ref import resolve_entity_refs
from src.models.account import Account
from src.models.comment import Comment
from src.models.enum import CommentStatus, EntityType, SearchEntityType
from src.models.search import Search
from src.serializes.entities import EntityRef
from src.serializes.search import SearchResultItem
from src.utils.tiptap import tiptap_to_text

_SEARCH_CONFIG = "french"
_EXCERPT_LENGTH = 200
# Strip the tsquery operators so a raw user term can't inject syntax.
_TSQUERY_SPECIALS = re.compile(r"[&|!()<>:*'\\\"]")


@dataclass(frozen=True)
class _EntityShim:
    """Minimal (`entity_type`, `entity_id`) pair `resolve_entity_refs` accepts."""

    entity_type: EntityType
    entity_id: uuid.UUID


def build_tsquery_text(query: str, mode: str) -> str:
    """Turn a user query into `to_tsquery` input.

    `simple` (default): each word is sanitised and turned into a prefix term
    (`word:*`), all AND-ed — forgiving, matches as-you-type. `expert`: passed
    through untouched so power users can write raw tsquery syntax.
    """
    if mode == "expert":
        return query.strip()
    words = (_TSQUERY_SPECIALS.sub(" ", query)).split()
    return " & ".join(f"{word}:*" for word in words if word)


class SearchManager(BaseEntityManager):
    def _conditions(self, account: Account, tsquery):
        return [
            Search.account_id == account.id,
            Search.enabled.is_(True),
            Search.deleted_at.is_(None),
            Search.vector.op("@@")(tsquery),
        ]

    def search(
        self,
        account: Account,
        query: str,
        *,
        entity_types: list[SearchEntityType] | None = None,
        page: int = 1,
        limit: int = 20,
        mode: str = "simple",
    ) -> tuple[list[tuple[Search, float]], int]:
        """Ranked page of `(search_row, score)` plus the total match count."""
        query_text = build_tsquery_text(query, mode)
        if not query_text:
            return [], 0

        tsquery = func.to_tsquery(_SEARCH_CONFIG, query_text)
        conditions = self._conditions(account, tsquery)
        if entity_types:
            conditions.append(Search.entity_type.in_(entity_types))

        count = self.session.exec(
            select(func.count(Search.id)).where(*conditions)
        ).one()
        if not count:
            return [], count

        rank = func.ts_rank(Search.vector, tsquery)
        rows = self.session.exec(
            select(Search, rank.label("score"))
            .where(*conditions)
            .order_by(rank.desc(), Search.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        ).all()
        return [(row, float(score)) for row, score in rows], count

    def counts(
        self, account: Account, query: str, *, mode: str = "simple"
    ) -> dict[SearchEntityType, int]:
        """Match count per entity type (zero-filled for every type)."""
        counts = {entity_type: 0 for entity_type in SearchEntityType}
        query_text = build_tsquery_text(query, mode)
        if not query_text:
            return counts

        tsquery = func.to_tsquery(_SEARCH_CONFIG, query_text)
        rows = self.session.exec(
            select(Search.entity_type, func.count(Search.id))
            .where(*self._conditions(account, tsquery))
            .group_by(Search.entity_type)
        ).all()
        for entity_type, count in rows:
            counts[entity_type] = count
        return counts

    def resolve_results(
        self, account: Account, scored_rows: list[tuple[Search, float]]
    ) -> list[SearchResultItem]:
        """Turn ranked index rows into navigable results, dropping orphans.

        A result is dropped when its target entity can no longer be resolved
        (soft-deleted, or a stale index row from a bulk cascade) — the index is
        best-effort, correctness comes from this re-resolution.
        """
        comment_ids = [
            row.entity_id
            for row, _ in scored_rows
            if row.entity_type == SearchEntityType.COMMENT
        ]
        comments = self._load_comments(account, comment_ids)

        # Resolve every navigable target in two batched passes: the entity hits
        # directly, and the commented entities the comment hits point at.
        entity_shims = [
            _EntityShim(EntityType(row.entity_type.value), row.entity_id)
            for row, _ in scored_rows
            if row.entity_type != SearchEntityType.COMMENT
        ]
        comment_shims = [
            _EntityShim(comment.entity_type, comment.entity_id)
            for comment in comments.values()
        ]
        refs = resolve_entity_refs(self.session, account.id, entity_shims + comment_shims)

        results: list[SearchResultItem] = []
        for row, score in scored_rows:
            if row.entity_type == SearchEntityType.COMMENT:
                item = self._comment_result(row, score, comments, refs)
            else:
                item = self._entity_result(row, score, refs)
            if item is not None:
                results.append(item)
        return results

    def _load_comments(
        self, account: Account, comment_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, Comment]:
        if not comment_ids:
            return {}
        rows = self.session.exec(
            select(Comment).where(
                Comment.id.in_(comment_ids),
                Comment.account_id == account.id,
                Comment.enabled.is_(True),
                Comment.status == CommentStatus.PUBLISHED,
            )
        ).all()
        return {comment.id: comment for comment in rows}

    @staticmethod
    def _entity_result(
        row: Search, score: float, refs: dict[tuple[EntityType, uuid.UUID], EntityRef]
    ) -> SearchResultItem | None:
        resource = refs.get((EntityType(row.entity_type.value), row.entity_id))
        if resource is None:
            return None
        return SearchResultItem(
            id=row.id,
            entity_type=row.entity_type,
            entity_id=row.entity_id,
            score=score,
            label=resource.label,
            excerpt=None,
            resource=resource,
        )

    @staticmethod
    def _comment_result(
        row: Search,
        score: float,
        comments: dict[uuid.UUID, Comment],
        refs: dict[tuple[EntityType, uuid.UUID], EntityRef],
    ) -> SearchResultItem | None:
        comment = comments.get(row.entity_id)
        if comment is None:
            return None
        resource = refs.get((comment.entity_type, comment.entity_id))
        if resource is None:
            return None
        excerpt = tiptap_to_text(comment.value)
        return SearchResultItem(
            id=row.id,
            entity_type=row.entity_type,
            entity_id=comment.id,
            score=score,
            label=excerpt[:_EXCERPT_LENGTH] or resource.label,
            excerpt=excerpt[:_EXCERPT_LENGTH] or None,
            resource=resource,
        )
