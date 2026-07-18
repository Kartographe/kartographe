# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Scenario lifecycle: listing, creation (with persona checks), status flips and
cascading delete."""

import uuid

from sqlmodel import func, select

from src.filters._base import SortOrder
from src.filters.journey_scenarios import JourneyScenarioSortField
from src.managers._arrays import uuid_array_overlap
from src.managers._base import BaseEntityManager
from src.managers.tagging import tag_overlap
from src.managers.persona import assert_personas_in_account
from src.models.account import Account
from src.models.enum import JourneyScenarioCriticity, JourneyScenarioStatus, JourneyScenarioType
from src.models.journey import Journey
from src.models.journey_scenario import JourneyScenario
from src.models.journey_scenario_step import JourneyScenarioStep
from src.models.journey_scenario_step_assertion import JourneyScenarioStepAssertion
from src.models.journey_scenario_step_file import JourneyScenarioStepFile
from src.models.journey_scenario_step_route import JourneyScenarioStepRoute
from src.models.user import User
from src.utils.datetime import utc_now

_SORT_COLUMNS = {
    JourneyScenarioSortField.DATE: JourneyScenario.date,
    JourneyScenarioSortField.TITLE: JourneyScenario.title,
    JourneyScenarioSortField.STATUS: JourneyScenario.status,
    JourneyScenarioSortField.TYPE: JourneyScenario.type,
    JourneyScenarioSortField.CRITICITY: JourneyScenario.criticity,
}


class JourneyScenarioManager(BaseEntityManager):
    def list_for_account(
        self,
        account: Account,
        *,
        statuses: list[JourneyScenarioStatus] | None = None,
        types: list[JourneyScenarioType] | None = None,
        criticities: list[JourneyScenarioCriticity] | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        persona_ids: list[uuid.UUID] | None = None,
        sort_by: JourneyScenarioSortField = JourneyScenarioSortField.DATE,
        sort_order: SortOrder = SortOrder.DESC,
        page: int = 1,
        limit: int = 25,
    ) -> tuple[list[JourneyScenario], int, dict[uuid.UUID, str]]:
        """One page of the account's scenarios, across every journey.

        Returns `(rows, total, journey_titles)` where `journey_titles` maps each
        row's `journey_id` to its journey title (for display without a join per
        row).
        """
        conditions = [JourneyScenario.account_id == account.id, JourneyScenario.enabled.is_(True)]
        if statuses:
            conditions.append(JourneyScenario.status.in_(statuses))
        if types:
            conditions.append(JourneyScenario.type.in_(types))
        if criticities:
            conditions.append(JourneyScenario.criticity.in_(criticities))
        if tag_ids:
            conditions.append(tag_overlap(JourneyScenario, tag_ids))
        if persona_ids:
            # "Targets at least one of these personas", same overlap semantics as
            # the journeys listing. Unvalidated on purpose: an id from another
            # account simply matches nothing.
            conditions.append(uuid_array_overlap(JourneyScenario.personas_ids, persona_ids))

        base = select(JourneyScenario).where(*conditions)
        total = self.session.exec(select(func.count()).select_from(base.subquery())).one()

        column = _SORT_COLUMNS[sort_by]
        ordering = column.asc() if sort_order == SortOrder.ASC else column.desc()
        rows = list(
            self.session.exec(
                base.order_by(ordering).offset((page - 1) * limit).limit(limit)
            ).all()
        )
        return rows, total, self._journey_titles(rows)

    def _journey_titles(self, rows: list[JourneyScenario]) -> dict[uuid.UUID, str]:
        """Titles of the journeys the rows belong to, keyed by journey id."""
        journey_ids = {row.journey_id for row in rows}
        if not journey_ids:
            return {}
        found = self.session.exec(
            select(Journey.id, Journey.title).where(
                Journey.id.in_(journey_ids), Journey.enabled.is_(True)
            )
        ).all()
        return {journey_id: title for journey_id, title in found}

    def list_for_journey(
        self, journey: Journey, *, tag_ids: list[uuid.UUID] | None = None
    ) -> list[JourneyScenario]:
        """Every enabled scenario of the journey, most recent first.

        `tag_ids` keeps only the rows carrying at least one of those tags.
        """
        conditions = [JourneyScenario.journey_id == journey.id, JourneyScenario.enabled.is_(True)]
        if tag_ids:
            conditions.append(tag_overlap(JourneyScenario, tag_ids))
        return list(
            self.session.exec(
                select(JourneyScenario).where(*conditions).order_by(JourneyScenario.date.desc())
            ).all()
        )

    def create(
        self,
        account: Account,
        journey: Journey,
        user: User,
        *,
        type: JourneyScenarioType,
        personas_ids: list[uuid.UUID],
        title: str,
        criticity: JourneyScenarioCriticity,
        description: dict | None,
        tag_ids: list[uuid.UUID],
    ) -> JourneyScenario:
        """Create a draft scenario owned by `user` after checking the personas."""
        assert_personas_in_account(self.session, account, personas_ids)
        now = utc_now()
        scenario = JourneyScenario(
            account_id=account.id,
            journey_id=journey.id,
            owner_id=user.id,
            date=now,
            type=type,
            status=JourneyScenarioStatus.DRAFT,
            status_date=now,
            personas_ids=personas_ids,
            title=title,
            criticity=criticity,
            description=description,
            tag_ids=tag_ids,
        )
        return self._persist(scenario)

    def update(self, account: Account, scenario: JourneyScenario, fields: dict) -> JourneyScenario:
        """Apply a partial update, validating personas when they change."""
        if "personas_ids" in fields:
            assert_personas_in_account(self.session, account, fields["personas_ids"])
        return self.apply_update(scenario, fields)

    def soft_delete(self, scenario: JourneyScenario) -> None:
        """Soft-delete the scenario and its steps, files and assertions."""
        self._guard_unlocked(scenario)
        now = utc_now()
        self._disable(scenario, now)
        for model in (
            JourneyScenarioStep,
            JourneyScenarioStepFile,
            JourneyScenarioStepAssertion,
            JourneyScenarioStepRoute,
        ):
            self._bulk_disable(model, model.journey_scenario_id == scenario.id, now=now)
        self.session.commit()
