# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Comment lifecycle: post on an entity, reply, edit, remove and delete.

Comments are polymorphic — attached to an entity by (`entity_type`,
`entity_id`). A top-level list returns the entity's root comments; replies are
fetched per comment. Removing keeps the row but clears its `value`; deleting
soft-deletes the comment and its direct replies.
"""

import uuid
from datetime import datetime

from sqlmodel import select

from src.filters._base import SortOrder
from src.filters.comments import CommentSortField
from src.managers._base import BaseEntityManager
from src.managers.comment_entity import resolve_entity_refs
from src.models.account import Account
from src.models.comment import Comment
from src.models.enum import CommentEntityType, CommentStatus
from src.models.user import User
from src.serializes.comments import CommentEntityRef
from src.utils.datetime import to_naive_utc, utc_now

_SORT_COLUMNS = {
    CommentSortField.DATE: Comment.date,
    CommentSortField.STATUS: Comment.status,
    CommentSortField.STATUS_DATE: Comment.status_date,
}


class CommentManager(BaseEntityManager):
    def list_for_account(
        self,
        account: Account,
        *,
        entity_types: list[CommentEntityType] | None = None,
        entity_ids: list[uuid.UUID] | None = None,
        owner_ids: list[uuid.UUID] | None = None,
        statuses: list[CommentStatus] | None = None,
        lbound: datetime | None = None,
        ubound: datetime | None = None,
        sort_by: CommentSortField = CommentSortField.DATE,
        sort_order: SortOrder = SortOrder.DESC,
    ) -> list[Comment]:
        """The account's enabled comments, filtered and sorted (most recent first by default).

        `lbound` / `ubound` are inclusive bounds on `date`.
        """
        conditions = [Comment.account_id == account.id, Comment.enabled.is_(True)]
        if entity_types:
            conditions.append(Comment.entity_type.in_(entity_types))
        if entity_ids:
            conditions.append(Comment.entity_id.in_(entity_ids))
        if owner_ids:
            conditions.append(Comment.owner_id.in_(owner_ids))
        if statuses:
            conditions.append(Comment.status.in_(statuses))
        if (lower := to_naive_utc(lbound)) is not None:
            conditions.append(Comment.date >= lower)
        if (upper := to_naive_utc(ubound)) is not None:
            conditions.append(Comment.date <= upper)

        column = _SORT_COLUMNS[sort_by]
        ordering = column.asc() if sort_order == SortOrder.ASC else column.desc()
        return list(
            self.session.exec(select(Comment).where(*conditions).order_by(ordering)).all()
        )

    def list_for_entity(
        self, account: Account, entity_type: CommentEntityType, entity_id: uuid.UUID
    ) -> list[Comment]:
        """The entity's root comments (no parent), oldest first."""
        return list(
            self.session.exec(
                select(Comment)
                .where(
                    Comment.account_id == account.id,
                    Comment.entity_type == entity_type,
                    Comment.entity_id == entity_id,
                    Comment.parent_comment_id.is_(None),
                    Comment.enabled.is_(True),
                )
                .order_by(Comment.date.asc())
            ).all()
        )

    def resolve_entities(
        self, account: Account, comments: list[Comment]
    ) -> dict[tuple[CommentEntityType, uuid.UUID], CommentEntityRef]:
        """Display-ready refs for the entities the comments point at, keyed by target."""
        return resolve_entity_refs(self.session, account.id, comments)

    def list_replies(self, comment: Comment) -> list[Comment]:
        """Direct replies to a comment, oldest first."""
        return list(
            self.session.exec(
                select(Comment)
                .where(
                    Comment.parent_comment_id == comment.id,
                    Comment.enabled.is_(True),
                )
                .order_by(Comment.date.asc())
            ).all()
        )

    def create(
        self,
        account: Account,
        user: User,
        *,
        entity_type: CommentEntityType,
        entity_id: uuid.UUID,
        value: dict,
        parent_comment_id: uuid.UUID | None = None,
    ) -> Comment:
        """Post a published comment on an entity (optionally as a reply)."""
        now = utc_now()
        comment = Comment(
            account_id=account.id,
            owner_id=user.id,
            parent_comment_id=parent_comment_id,
            date=now,
            status=CommentStatus.PUBLISHED,
            status_date=now,
            entity_type=entity_type,
            entity_id=entity_id,
            value=value,
        )
        return self._persist(comment)

    def create_reply(self, account: Account, user: User, parent: Comment, *, value: dict) -> Comment:
        """Reply to `parent`, inheriting its entity."""
        return self.create(
            account,
            user,
            entity_type=parent.entity_type,
            entity_id=parent.entity_id,
            value=value,
            parent_comment_id=parent.id,
        )

    def update_value(self, comment: Comment, value: dict) -> Comment:
        """Edit a comment's content."""
        return self.apply_update(comment, {"value": value})

    def remove(self, comment: Comment) -> Comment:
        """Mark a comment as removed and drop its content."""
        now = utc_now()
        comment.status = CommentStatus.REMOVED
        comment.status_date = now
        comment.value = None
        comment.updated_at = now
        return self._persist(comment)

    def soft_delete(self, comment: Comment) -> None:
        """Soft-delete the comment and its direct replies."""
        now = utc_now()
        self._disable(comment, now)
        self._bulk_disable(Comment, Comment.parent_comment_id == comment.id, now=now)
        self.session.commit()
