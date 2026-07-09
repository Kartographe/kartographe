"""Comment lifecycle: post on an entity, reply, edit, remove and delete.

Comments are polymorphic — attached to an entity by (`entity_type`,
`entity_id`). A top-level list returns the entity's root comments; replies are
fetched per comment. Removing keeps the row but clears its `value`; deleting
soft-deletes the comment and its direct replies.
"""

import uuid

from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.account import Account
from src.models.comment import Comment
from src.models.enum import CommentEntityType, CommentStatus
from src.models.user import User
from src.utils.datetime import utc_now


class CommentManager(BaseEntityManager):
    def list_for_account(self, account: Account) -> list[Comment]:
        """Every enabled comment of the account, most recent first."""
        return list(
            self.session.exec(
                select(Comment)
                .where(Comment.account_id == account.id, Comment.enabled.is_(True))
                .order_by(Comment.date.desc())
            ).all()
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
