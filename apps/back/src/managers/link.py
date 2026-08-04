# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Link lifecycle: attach a reference to an entity, edit it, drop it.

References are polymorphic — attached to an entity by (`entity_type`,
`entity_id`) over the shared `EntityType` list, exactly like comments and
estimates.

The one thing a reference does beyond storing a URL is *read* it: when the URL
leads back into this instance, `decorate` turns it into a structured pointer at
the target entity — but only for a caller who is a member of the account that
owns it. Resolution is batched per listing (one membership query, then one
`resolve_entity_refs` pass per account), never per row.
"""

import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime

from sqlmodel import select

from src.filters._base import SortOrder
from src.filters.links import LinkSortField
from src.managers._base import BaseEntityManager
from src.managers.entity_ref import resolve_entity_refs
from src.models.account import Account
from src.models.account_user import AccountUser
from src.models.enum import AccountUserStatus, EntityType, LinkType
from src.models.link import Link
from src.models.user import User
from src.serializes.entities import EntityRef
from src.serializes.links import LinkInternalRef, LinkMeta
from src.services.link_preview import fetch_title
from src.utils.datetime import to_naive_utc, utc_now
from src.utils.links import InternalTarget, host_of, parse_internal_url

_SORT_COLUMNS = {
    LinkSortField.DATE: Link.date,
    LinkSortField.TITLE: Link.title,
    LinkSortField.TYPE: Link.type,
}


@dataclass(frozen=True)
class _EntityTarget:
    """A stand-in for a stored row, so `resolve_entity_refs` can be reused."""

    entity_type: EntityType
    entity_id: uuid.UUID


class LinkManager(BaseEntityManager):
    # --- reading ---------------------------------------------------------

    def list_for_account(
        self,
        account: Account,
        *,
        entity_types: list[EntityType] | None = None,
        entity_ids: list[uuid.UUID] | None = None,
        owner_ids: list[uuid.UUID] | None = None,
        types: list[LinkType] | None = None,
        lbound: datetime | None = None,
        ubound: datetime | None = None,
        sort_by: LinkSortField = LinkSortField.DATE,
        sort_order: SortOrder = SortOrder.DESC,
    ) -> list[Link]:
        """The account's live references, filtered and sorted (most recent first
        by default).

        `lbound` / `ubound` are inclusive bounds on `date`.
        """
        conditions = [Link.account_id == account.id, Link.enabled.is_(True)]
        if entity_types:
            conditions.append(Link.entity_type.in_(entity_types))
        if entity_ids:
            conditions.append(Link.entity_id.in_(entity_ids))
        if owner_ids:
            conditions.append(Link.owner_id.in_(owner_ids))
        if types:
            conditions.append(Link.type.in_(types))
        if (lower := to_naive_utc(lbound)) is not None:
            conditions.append(Link.date >= lower)
        if (upper := to_naive_utc(ubound)) is not None:
            conditions.append(Link.date <= upper)

        column = _SORT_COLUMNS[sort_by]
        ordering = column.asc() if sort_order == SortOrder.ASC else column.desc()
        return list(self.session.exec(select(Link).where(*conditions).order_by(ordering)).all())

    def list_for_entity(
        self, account: Account, entity_type: EntityType, entity_id: uuid.UUID
    ) -> list[Link]:
        """The references attached to the entity, oldest first."""
        return list(
            self.session.exec(
                select(Link)
                .where(
                    Link.account_id == account.id,
                    Link.entity_type == entity_type,
                    Link.entity_id == entity_id,
                    Link.enabled.is_(True),
                )
                .order_by(Link.date.asc())
            ).all()
        )

    def resolve_entities(
        self, account: Account, rows: list[Link]
    ) -> dict[tuple[EntityType, uuid.UUID], EntityRef]:
        """Display-ready refs for the entities the references are attached to."""
        return resolve_entity_refs(self.session, account.id, rows)

    def entity_exists(
        self, account: Account, entity_type: EntityType, entity_id: uuid.UUID
    ) -> bool:
        """Whether the entity exists, is live and belongs to the account.

        Reuses the polymorphic resolver so the account-wide endpoint can validate
        any target without a per-type lookup.
        """
        target = _EntityTarget(entity_type=entity_type, entity_id=entity_id)
        return bool(resolve_entity_refs(self.session, account.id, [target]))

    # --- URL reading -----------------------------------------------------

    def _readable_accounts(self, user: User, account_ids: set[uuid.UUID]) -> set[uuid.UUID]:
        """Of `account_ids`, those the user actively holds a seat in."""
        if not account_ids:
            return set()
        rows = self.session.exec(
            select(AccountUser.account_id).where(
                AccountUser.account_id.in_(account_ids),
                AccountUser.user_id == user.id,
                AccountUser.status == AccountUserStatus.ACTIVE,
                AccountUser.enabled.is_(True),
            )
        ).all()
        return set(rows)

    def resolve_urls(self, user: User, urls: list[str]) -> dict[str, LinkMeta]:
        """Read each URL as far as the caller is allowed to see, keyed by URL.

        A URL on this instance whose entity the caller may reach comes back with
        an `internal` pointer; anything else comes back with its host alone. The
        permission check is the point: without it, an internal reference would
        confirm the existence of entities in accounts the reader is not part of.
        """
        targets: dict[str, InternalTarget] = {}
        for url in set(urls):
            if (target := parse_internal_url(url)) is not None:
                targets[url] = target

        allowed = self._readable_accounts(user, {t.account_id for t in targets.values()})

        # Group the reachable targets per account: `resolve_entity_refs` is
        # scoped to one account, and resolves a whole batch in one pass.
        by_account: dict[uuid.UUID, list[InternalTarget]] = defaultdict(list)
        for target in targets.values():
            if target.account_id in allowed:
                by_account[target.account_id].append(target)

        refs: dict[uuid.UUID, dict[tuple[EntityType, uuid.UUID], EntityRef]] = {
            account_id: resolve_entity_refs(
                self.session,
                account_id,
                [_EntityTarget(t.entity_type, t.entity_id) for t in account_targets],
            )
            for account_id, account_targets in by_account.items()
        }

        metas: dict[str, LinkMeta] = {}
        for url in set(urls):
            internal = None
            target = targets.get(url)
            if target is not None and target.account_id in allowed:
                entity = refs[target.account_id].get((target.entity_type, target.entity_id))
                if entity is not None:
                    internal = LinkInternalRef(
                        account_id=target.account_id, entity=entity, path=target.path
                    )
            metas[url] = LinkMeta(host=host_of(url), internal=internal)
        return metas

    def decorate(self, user: User, items: list) -> list:
        """Fill each serialized item's `meta` from its URL, in place.

        Call after serializing a listing or a single item — one membership query
        and one resolver pass for the whole batch.
        """
        if not items:
            return items
        metas = self.resolve_urls(user, [item.url for item in items])
        for item in items:
            item.meta = metas[item.url]
        return items

    def decorate_one(self, user: User, item):
        """`decorate` for a single serialized item."""
        self.decorate(user, [item])
        return item

    def prefill(self, user: User, url: str) -> tuple[str | None, LinkType, LinkMeta]:
        """Propose a title, a kind and the read URL for a not-yet-saved reference.

        An internal URL is answered from the database — its entity's label, no
        outbound request. Anything else is fetched (guarded, best-effort); a page
        that cannot be read simply yields no title.
        """
        meta = self.resolve_urls(user, [url])[url]
        if meta.internal is not None:
            return meta.internal.entity.label, LinkType.KARTOGRAPHE, meta
        return fetch_title(url), LinkType.OTHER, meta

    # --- writing ---------------------------------------------------------

    def create(
        self,
        account: Account,
        user: User,
        *,
        entity_type: EntityType,
        entity_id: uuid.UUID,
        url: str,
        type: LinkType,
        title: str | None = None,
        description: dict | None = None,
    ) -> Link:
        """Attach a reference to an entity."""
        link = Link(
            account_id=account.id,
            owner_id=user.id,
            date=utc_now(),
            entity_type=entity_type,
            entity_id=entity_id,
            type=type,
            title=title,
            description=description,
            url=url,
        )
        return self._persist(link)

    def update(self, link: Link, fields: dict) -> Link:
        """Apply a partial update (snake_case keys, already validated)."""
        return self.apply_update(link, fields)

    def soft_delete(self, link: Link) -> None:
        """Soft-delete the reference."""
        self._disable(link, utc_now())
        self.session.commit()
