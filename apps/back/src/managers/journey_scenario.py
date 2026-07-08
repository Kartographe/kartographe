"""Scenario lifecycle: listing, creation (with persona checks), status flips and
cascading delete."""

import uuid

from sqlmodel import select

from src.managers._base import BaseEntityManager
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


class JourneyScenarioManager(BaseEntityManager):
    def list_for_journey(self, journey: Journey) -> list[JourneyScenario]:
        """Every enabled scenario of the journey, most recent first."""
        return list(
            self.session.exec(
                select(JourneyScenario)
                .where(
                    JourneyScenario.journey_id == journey.id,
                    JourneyScenario.enabled.is_(True),
                )
                .order_by(JourneyScenario.date.desc())
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
        )
        return self._persist(scenario)

    def update(self, account: Account, scenario: JourneyScenario, fields: dict) -> JourneyScenario:
        """Apply a partial update, validating personas when they change."""
        if "personas_ids" in fields:
            assert_personas_in_account(self.session, account, fields["personas_ids"])
        return self.apply_update(scenario, fields)

    def soft_delete(self, scenario: JourneyScenario) -> None:
        """Soft-delete the scenario and its steps, files and assertions."""
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
