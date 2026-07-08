"""Persona lifecycle + the shared "personas belong to the account" guard."""

import uuid

from fastapi import HTTPException, status
from sqlmodel import func, select

from src.filters._base import SortOrder
from src.filters.personas import PersonaSortField
from src.managers._base import BaseEntityManager
from src.models.account import Account
from src.models.enum import PersonaStatus, PersonaType
from src.models.persona import Persona
from src.utils.datetime import utc_now

_SORT_COLUMNS = {
    PersonaSortField.DATE: Persona.date,
    PersonaSortField.TITLE: Persona.title,
    PersonaSortField.STATUS: Persona.status,
    PersonaSortField.TYPE: Persona.type,
}


def assert_personas_in_account(session, account: Account, persona_ids: list[uuid.UUID]) -> None:
    """Reject unless every id is an enabled persona of the account."""
    if not persona_ids:
        return
    unique = set(persona_ids)
    found = set(
        session.exec(
            select(Persona.id).where(
                Persona.account_id == account.id,
                Persona.id.in_(unique),
                Persona.enabled.is_(True),
            )
        ).all()
    )
    missing = unique - found
    if missing:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Persona(s) not found in this account: {', '.join(str(m) for m in sorted(missing, key=str))}.",
        )


class PersonaManager(BaseEntityManager):
    def list_for_account(
        self,
        account: Account,
        *,
        statuses: list[PersonaStatus] | None = None,
        types: list[PersonaType] | None = None,
        sort_by: PersonaSortField = PersonaSortField.DATE,
        sort_order: SortOrder = SortOrder.DESC,
        page: int = 1,
        limit: int = 25,
    ) -> tuple[list[Persona], int]:
        """One page of the account's personas. Returns `(rows, total)`."""
        conditions = [Persona.account_id == account.id, Persona.enabled.is_(True)]
        if statuses:
            conditions.append(Persona.status.in_(statuses))
        if types:
            conditions.append(Persona.type.in_(types))

        base = select(Persona).where(*conditions)
        total = self.session.exec(select(func.count()).select_from(base.subquery())).one()

        column = _SORT_COLUMNS[sort_by]
        ordering = column.asc() if sort_order == SortOrder.ASC else column.desc()
        rows = self.session.exec(
            base.order_by(ordering).offset((page - 1) * limit).limit(limit)
        ).all()
        return list(rows), total

    def create(
        self, account: Account, *, type: PersonaType, title: str, description: dict | None
    ) -> Persona:
        """Create a draft persona."""
        persona = Persona(
            account_id=account.id,
            type=type,
            status=PersonaStatus.DRAFT,
            date=utc_now(),
            title=title,
            description=description,
        )
        return self._persist(persona)

    def soft_delete(self, persona: Persona) -> None:
        now = utc_now()
        self._disable(persona, now)
        self.session.commit()
