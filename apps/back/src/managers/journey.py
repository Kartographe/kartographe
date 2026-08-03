# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Journey lifecycle: listing, creation (with persona checks), status flips and
cascading delete."""

import uuid

from sqlmodel import func, select

from src.filters._base import SortOrder
from src.filters.journeys import JourneySortField
from src.managers._arrays import uuid_array_overlap
from src.managers._base import BaseEntityManager
from src.managers.entity_counts import my_complexity_filter, my_vote_filter
from src.managers.persona import assert_personas_in_account
from src.managers.tagging import tag_overlap
from src.models.account import Account
from src.models.enum import EntityType, JourneyStatus, JourneyType
from src.models.feature_journey import FeatureJourney
from src.models.journey import Journey
from src.models.journey_scenario import JourneyScenario
from src.models.journey_scenario_step import JourneyScenarioStep
from src.models.journey_scenario_step_assertion import JourneyScenarioStepAssertion
from src.models.journey_scenario_step_file import JourneyScenarioStepFile
from src.models.journey_scenario_step_route import JourneyScenarioStepRoute
from src.models.user import User
from src.utils.datetime import utc_now

_SORT_COLUMNS = {
    JourneySortField.DATE: Journey.date,
    JourneySortField.TITLE: Journey.title,
    JourneySortField.STATUS: Journey.status,
    JourneySortField.TYPE: Journey.type,
}


class JourneyManager(BaseEntityManager):
    def list_for_account(
        self,
        account: Account,
        *,
        statuses: list[JourneyStatus] | None = None,
        types: list[JourneyType] | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        persona_ids: list[uuid.UUID] | None = None,
        my_vote: str | None = None,
        my_complexity: str | None = None,
        user_id: uuid.UUID | None = None,
        sort_by: JourneySortField = JourneySortField.DATE,
        sort_order: SortOrder = SortOrder.DESC,
        page: int = 1,
        limit: int = 25,
    ) -> tuple[list[Journey], int]:
        """One page of the account's journeys. Returns `(rows, total)`."""
        conditions = [Journey.account_id == account.id, Journey.enabled.is_(True)]
        if statuses:
            conditions.append(Journey.status.in_(statuses))
        if types:
            conditions.append(Journey.type.in_(types))
        if tag_ids:
            conditions.append(tag_overlap(Journey, tag_ids))
        if persona_ids:
            # "Targets at least one of these personas", same overlap semantics as
            # tags. Unvalidated on purpose: an id from another account simply
            # matches nothing, and 404-ing here would let a caller probe which
            # persona ids exist elsewhere. Writes do validate.
            conditions.append(uuid_array_overlap(Journey.personas_ids, persona_ids))
        if my_vote and user_id:
            conditions.append(my_vote_filter(Journey, EntityType.JOURNEY, user_id, my_vote))

        if my_complexity and user_id:
            conditions.append(my_complexity_filter(Journey, EntityType.JOURNEY, user_id, my_complexity))

        base = select(Journey).where(*conditions)
        total = self.session.exec(select(func.count()).select_from(base.subquery())).one()

        column = _SORT_COLUMNS[sort_by]
        ordering = column.asc() if sort_order == SortOrder.ASC else column.desc()
        rows = self.session.exec(
            base.order_by(ordering).offset((page - 1) * limit).limit(limit)
        ).all()
        return list(rows), total

    def create(
        self,
        account: Account,
        user: User,
        *,
        type: JourneyType,
        title: str,
        description: dict | None,
        personas_ids: list[uuid.UUID],
        tag_ids: list[uuid.UUID],
    ) -> Journey:
        """Create a draft journey owned by `user` after checking the personas."""
        assert_personas_in_account(self.session, account, personas_ids)
        now = utc_now()
        journey = Journey(
            account_id=account.id,
            owner_id=user.id,
            date=now,
            type=type,
            personas_ids=personas_ids,
            status=JourneyStatus.DRAFT,
            status_date=now,
            title=title,
            description=description,
            tag_ids=tag_ids,
        )
        return self._persist(journey)

    def update(self, account: Account, journey: Journey, fields: dict) -> Journey:
        """Apply a partial update, validating personas when they change."""
        if "personas_ids" in fields:
            assert_personas_in_account(self.session, account, fields["personas_ids"])
        return self.apply_update(journey, fields)

    def soft_delete(self, journey: Journey) -> None:
        """Soft-delete the journey and every child entity that hangs off it."""
        self._guard_unlocked(journey)
        now = utc_now()
        self._disable(journey, now)
        for model in (
            JourneyScenario,
            JourneyScenarioStep,
            JourneyScenarioStepFile,
            JourneyScenarioStepAssertion,
            JourneyScenarioStepRoute,
            FeatureJourney,
        ):
            self._bulk_disable(model, model.journey_id == journey.id, now=now)
        self.session.commit()
