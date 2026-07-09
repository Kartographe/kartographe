"""Tag lifecycle: listing, creation, update and delete.

Deleting a tag also removes its id from the `tag_ids` array of the entity table
its `entity_type` targets, so no entity keeps a dangling reference.
"""

import uuid
from typing import TypeVar

from sqlalchemy import func, update
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.managers.tagging import TAGGED_MODEL
from src.models.account import Account
from src.models.enum import TagEntityType
from src.models.tag import Tag
from src.serializes._base import CamelBase
from src.serializes.tags import TagItem
from src.utils.datetime import utc_now

ItemT = TypeVar("ItemT", bound=CamelBase)


class TagManager(BaseEntityManager):
    def index_for(self, rows: list) -> dict[uuid.UUID, TagItem]:
        """The tags carried by `rows`, keyed by id, in a single query.

        Scoped to the rows' own accounts. Soft-deleted tags are skipped, so an
        entity whose `tag_ids` still holds a stale id simply serializes with
        fewer tags rather than failing.
        """
        tag_ids = {tag_id for row in rows for tag_id in (row.tag_ids or [])}
        if not tag_ids:
            return {}
        found = self.session.exec(
            select(Tag).where(
                Tag.id.in_(tag_ids),
                Tag.account_id.in_({row.account_id for row in rows}),
                Tag.enabled.is_(True),
            )
        ).all()
        return {tag.id: TagItem.model_validate(tag) for tag in found}

    def attach(
        self, rows: list, item_cls: type[ItemT], index: dict[uuid.UUID, TagItem] | None = None
    ) -> list[ItemT]:
        """Serialize `rows` with their `tags` resolved — one query for the whole page.

        Pass a prebuilt `index` to share one lookup across several row kinds
        (e.g. tables and their nested columns).
        """
        if index is None:
            index = self.index_for(rows)
        return [self.serialize(row, item_cls, index) for row in rows]

    def attach_one(self, row, item_cls: type[ItemT]) -> ItemT:
        """Serialize a single row with its `tags` resolved."""
        return self.serialize(row, item_cls, self.index_for([row]))

    @staticmethod
    def serialize(row, item_cls: type[ItemT], index: dict[uuid.UUID, TagItem]) -> ItemT:
        """Build one item, filling `tags` from an already-built index."""
        tags = [index[tag_id] for tag_id in (row.tag_ids or []) if tag_id in index]
        return item_cls.model_validate(row).model_copy(update={"tags": tags})
    def list_for_account(
        self, account: Account, *, entity_type: TagEntityType | None = None
    ) -> list[Tag]:
        """Every enabled tag of the account, optionally filtered by entity type."""
        conditions = [Tag.account_id == account.id, Tag.enabled.is_(True)]
        if entity_type is not None:
            conditions.append(Tag.entity_type == entity_type)
        return list(
            self.session.exec(select(Tag).where(*conditions).order_by(Tag.label.asc())).all()
        )

    def create(
        self,
        account: Account,
        *,
        entity_type: TagEntityType,
        label: str,
        background_color: str,
        text_color: str,
    ) -> Tag:
        """Create a tag for `entity_type`."""
        tag = Tag(
            account_id=account.id,
            entity_type=entity_type,
            label=label,
            background_color=background_color,
            text_color=text_color,
        )
        return self._persist(tag)

    def soft_delete(self, tag: Tag) -> None:
        """Soft-delete the tag and detach it from every entity that carried it."""
        now = utc_now()
        self._disable(tag, now)
        model = TAGGED_MODEL[tag.entity_type]
        self.session.execute(
            update(model)
            .where(
                model.account_id == tag.account_id,
                func.array_position(model.tag_ids, tag.id).isnot(None),
            )
            .values(tag_ids=func.array_remove(model.tag_ids, tag.id), updated_at=now)
        )
        self.session.commit()
