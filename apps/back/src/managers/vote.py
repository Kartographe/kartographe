# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Vote lifecycle: cast, re-cast and list a member's stance on an entity.

Votes are polymorphic — attached to an entity by (`entity_type`, `entity_id`)
over the shared `EntityType` list. A member holds at most one live vote per
entity: casting again updates the existing row (value + role snapshot + date)
rather than adding another.
"""

import uuid
from datetime import datetime

from sqlmodel import select

from src.filters._base import SortOrder
from src.filters.votes import VoteSortField
from src.managers._base import BaseEntityManager
from src.managers.entity_ref import resolve_entity_refs
from src.models.account import Account
from src.models.account_user import AccountUser
from src.models.enum import EntityType, VoteRole, VoteValue
from src.models.vote import Vote
from src.serializes.entities import EntityRef
from src.utils.datetime import to_naive_utc, utc_now

_SORT_COLUMNS = {
    VoteSortField.DATE: Vote.date,
    VoteSortField.VALUE: Vote.value,
    VoteSortField.ROLE: Vote.role,
}


class VoteManager(BaseEntityManager):
    def list_for_account(
        self,
        account: Account,
        *,
        entity_types: list[EntityType] | None = None,
        entity_ids: list[uuid.UUID] | None = None,
        owner_ids: list[uuid.UUID] | None = None,
        roles: list[VoteRole] | None = None,
        values: list[VoteValue] | None = None,
        lbound: datetime | None = None,
        ubound: datetime | None = None,
        sort_by: VoteSortField = VoteSortField.DATE,
        sort_order: SortOrder = SortOrder.DESC,
    ) -> list[Vote]:
        """The account's live votes, filtered and sorted (most recent first by default).

        `lbound` / `ubound` are inclusive bounds on `date`.
        """
        conditions = [Vote.account_id == account.id, Vote.enabled.is_(True)]
        if entity_types:
            conditions.append(Vote.entity_type.in_(entity_types))
        if entity_ids:
            conditions.append(Vote.entity_id.in_(entity_ids))
        if owner_ids:
            conditions.append(Vote.owner_id.in_(owner_ids))
        if roles:
            conditions.append(Vote.role.in_(roles))
        if values:
            conditions.append(Vote.value.in_(values))
        if (lower := to_naive_utc(lbound)) is not None:
            conditions.append(Vote.date >= lower)
        if (upper := to_naive_utc(ubound)) is not None:
            conditions.append(Vote.date <= upper)

        column = _SORT_COLUMNS[sort_by]
        ordering = column.asc() if sort_order == SortOrder.ASC else column.desc()
        return list(
            self.session.exec(select(Vote).where(*conditions).order_by(ordering)).all()
        )

    def list_for_entity(
        self, account: Account, entity_type: EntityType, entity_id: uuid.UUID
    ) -> list[Vote]:
        """Every member's live vote on the entity, oldest first."""
        return list(
            self.session.exec(
                select(Vote)
                .where(
                    Vote.account_id == account.id,
                    Vote.entity_type == entity_type,
                    Vote.entity_id == entity_id,
                    Vote.enabled.is_(True),
                )
                .order_by(Vote.date.asc())
            ).all()
        )

    def resolve_entities(
        self, account: Account, votes: list[Vote]
    ) -> dict[tuple[EntityType, uuid.UUID], EntityRef]:
        """Display-ready refs for the entities the votes point at, keyed by target."""
        return resolve_entity_refs(self.session, account.id, votes)

    def _live_vote(
        self, account: Account, owner_id: uuid.UUID, entity_type: EntityType, entity_id: uuid.UUID
    ) -> Vote | None:
        return self.session.exec(
            select(Vote).where(
                Vote.account_id == account.id,
                Vote.owner_id == owner_id,
                Vote.entity_type == entity_type,
                Vote.entity_id == entity_id,
                Vote.enabled.is_(True),
            )
        ).first()

    def upsert(
        self,
        account: Account,
        member: AccountUser,
        *,
        entity_type: EntityType,
        entity_id: uuid.UUID,
        value: VoteValue,
    ) -> Vote:
        """Cast the member's vote on an entity, or update it if they already voted.

        The `role` is snapshotted from the member's current `vote_role`.
        """
        now = utc_now()
        existing = self._live_vote(account, member.user_id, entity_type, entity_id)
        if existing is not None:
            existing.value = value
            existing.role = member.vote_role
            existing.date = now
            existing.updated_at = now
            return self._persist(existing)

        vote = Vote(
            account_id=account.id,
            owner_id=member.user_id,
            date=now,
            entity_type=entity_type,
            entity_id=entity_id,
            role=member.vote_role,
            value=value,
        )
        return self._persist(vote)
