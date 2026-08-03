# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Complexity lifecycle: estimate, re-estimate and list an entity's estimates.

Estimates are polymorphic — attached to an entity by (`entity_type`,
`entity_id`) over the shared `EntityType` list, exactly like votes. A member
holds at most one live estimate per entity: estimating again updates the
existing row (value + mode snapshot + date) rather than adding another.

The scale is never chosen by the client: it is read from the account
(`technical_complexity_mode` / `product_complexity_mode`, picked by the entity's
scope) and the submitted value is checked against it.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlmodel import select

from src.filters._base import SortOrder
from src.filters.complexities import ComplexitySortField
from src.managers._base import BaseEntityManager
from src.managers.entity_ref import resolve_entity_refs
from src.models.account import Account
from src.models.account_user import AccountUser
from src.models.complexity import Complexity
from src.models.enum import ComplexityMode, ComplexityScope, EntityType
from src.serializes.entities import EntityRef
from src.utils.complexity import allowed_values, format_scale, is_allowed, scope_for
from src.utils.datetime import to_naive_utc, utc_now

_SORT_COLUMNS = {
    ComplexitySortField.DATE: Complexity.date,
    ComplexitySortField.VALUE: Complexity.value,
    ComplexitySortField.MODE: Complexity.mode,
}


@dataclass(frozen=True)
class _ComplexityTarget:
    """Minimal (`entity_type`, `entity_id`) pair `resolve_entity_refs` accepts."""

    entity_type: EntityType
    entity_id: uuid.UUID


class ComplexityManager(BaseEntityManager):
    def mode_for(self, account: Account, scope: ComplexityScope) -> ComplexityMode:
        """The scale the account uses for one of its two scopes."""
        if scope == ComplexityScope.TECHNICAL:
            return account.technical_complexity_mode
        return account.product_complexity_mode

    def scales(self, account: Account) -> list[tuple[ComplexityScope, ComplexityMode, list[Decimal]]]:
        """Both of the account's scales and the values they accept."""
        scales = []
        for scope in ComplexityScope:
            mode = self.mode_for(account, scope)
            scales.append((scope, mode, list(allowed_values(mode))))
        return scales

    def list_for_account(
        self,
        account: Account,
        *,
        entity_types: list[EntityType] | None = None,
        entity_ids: list[uuid.UUID] | None = None,
        owner_ids: list[uuid.UUID] | None = None,
        modes: list[ComplexityMode] | None = None,
        lbound: datetime | None = None,
        ubound: datetime | None = None,
        sort_by: ComplexitySortField = ComplexitySortField.DATE,
        sort_order: SortOrder = SortOrder.DESC,
    ) -> list[Complexity]:
        """The account's live estimates, filtered and sorted (most recent first
        by default).

        `lbound` / `ubound` are inclusive bounds on `date`.
        """
        conditions = [Complexity.account_id == account.id, Complexity.enabled.is_(True)]
        if entity_types:
            conditions.append(Complexity.entity_type.in_(entity_types))
        if entity_ids:
            conditions.append(Complexity.entity_id.in_(entity_ids))
        if owner_ids:
            conditions.append(Complexity.owner_id.in_(owner_ids))
        if modes:
            conditions.append(Complexity.mode.in_(modes))
        if (lower := to_naive_utc(lbound)) is not None:
            conditions.append(Complexity.date >= lower)
        if (upper := to_naive_utc(ubound)) is not None:
            conditions.append(Complexity.date <= upper)

        column = _SORT_COLUMNS[sort_by]
        ordering = column.asc() if sort_order == SortOrder.ASC else column.desc()
        return list(
            self.session.exec(select(Complexity).where(*conditions).order_by(ordering)).all()
        )

    def list_for_entity(
        self, account: Account, entity_type: EntityType, entity_id: uuid.UUID
    ) -> list[Complexity]:
        """Every member's live estimate on the entity, oldest first."""
        return list(
            self.session.exec(
                select(Complexity)
                .where(
                    Complexity.account_id == account.id,
                    Complexity.entity_type == entity_type,
                    Complexity.entity_id == entity_id,
                    Complexity.enabled.is_(True),
                )
                .order_by(Complexity.date.asc())
            ).all()
        )

    def resolve_entities(
        self, account: Account, rows: list[Complexity]
    ) -> dict[tuple[EntityType, uuid.UUID], EntityRef]:
        """Display-ready refs for the entities the estimates point at, keyed by target."""
        return resolve_entity_refs(self.session, account.id, rows)

    def entity_exists(
        self, account: Account, entity_type: EntityType, entity_id: uuid.UUID
    ) -> bool:
        """Whether the entity exists, is live and belongs to the account.

        Reuses the polymorphic resolver so the account-wide endpoint can validate
        any target without a per-type lookup: a resolved ref means the entity is
        real and in-account, a missing one means 404.
        """
        target = _ComplexityTarget(entity_type=entity_type, entity_id=entity_id)
        return bool(resolve_entity_refs(self.session, account.id, [target]))

    def _live_estimate(
        self, account: Account, owner_id: uuid.UUID, entity_type: EntityType, entity_id: uuid.UUID
    ) -> Complexity | None:
        return self.session.exec(
            select(Complexity).where(
                Complexity.account_id == account.id,
                Complexity.owner_id == owner_id,
                Complexity.entity_type == entity_type,
                Complexity.entity_id == entity_id,
                Complexity.enabled.is_(True),
            )
        ).first()

    def upsert(
        self,
        account: Account,
        member: AccountUser,
        *,
        entity_type: EntityType,
        entity_id: uuid.UUID,
        value: Decimal | None,
    ) -> Complexity:
        """Record the member's estimate on an entity, or update their previous one.

        The `mode` is snapshotted from the account's scale for the entity's
        scope, and `value` must belong to that scale (or be null).
        """
        mode = self.mode_for(account, scope_for(entity_type))
        if not is_allowed(mode, value):
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                f"Value is not on the account's {mode.value} scale: {format_scale(mode)}.",
            )

        now = utc_now()
        existing = self._live_estimate(account, member.user_id, entity_type, entity_id)
        if existing is not None:
            existing.value = value
            existing.mode = mode
            existing.date = now
            existing.updated_at = now
            return self._persist(existing)

        complexity = Complexity(
            account_id=account.id,
            owner_id=member.user_id,
            date=now,
            entity_type=entity_type,
            entity_id=entity_id,
            mode=mode,
            value=value,
        )
        return self._persist(complexity)
