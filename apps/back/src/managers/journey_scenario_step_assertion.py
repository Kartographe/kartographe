"""Assertion lifecycle: creation with parameter validation, status flips, delete."""

import uuid

from fastapi import HTTPException, status
from sqlmodel import select

from src.managers._base import BaseEntityManager, validate_parameters
from src.models.assertion_type import AssertionType
from src.models.enum import JourneyScenarioStepAssertionStatus
from src.models.journey_scenario_step import JourneyScenarioStep
from src.models.journey_scenario_step_assertion import JourneyScenarioStepAssertion
from src.models.user import User
from src.utils.datetime import utc_now


class JourneyScenarioStepAssertionManager(BaseEntityManager):
    def list_for_step(self, step: JourneyScenarioStep) -> list[JourneyScenarioStepAssertion]:
        """Every enabled assertion of the step, most recent first."""
        return list(
            self.session.exec(
                select(JourneyScenarioStepAssertion)
                .where(
                    JourneyScenarioStepAssertion.journey_scenario_step_id == step.id,
                    JourneyScenarioStepAssertion.enabled.is_(True),
                )
                .order_by(JourneyScenarioStepAssertion.date.desc())
            ).all()
        )

    def _assertion_schema(self, assertion_type_id: uuid.UUID) -> dict | None:
        assertion_type = self.session.get(AssertionType, assertion_type_id)
        if assertion_type is None or not assertion_type.enabled:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Assertion type not found.")
        return assertion_type.parameter_schema

    def create(
        self,
        step: JourneyScenarioStep,
        user: User,
        *,
        assertion_type_id: uuid.UUID,
        parameters: dict,
    ) -> JourneyScenarioStepAssertion:
        """Create a draft assertion, validating parameters against its type."""
        validate_parameters(self._assertion_schema(assertion_type_id), parameters)
        now = utc_now()
        assertion = JourneyScenarioStepAssertion(
            account_id=step.account_id,
            journey_id=step.journey_id,
            journey_scenario_id=step.journey_scenario_id,
            journey_scenario_step_id=step.id,
            owner_id=user.id,
            assertion_type_id=assertion_type_id,
            date=now,
            status=JourneyScenarioStepAssertionStatus.DRAFT,
            status_date=now,
            parameters=parameters,
        )
        return self._persist(assertion)

    def update(
        self, assertion: JourneyScenarioStepAssertion, fields: dict
    ) -> JourneyScenarioStepAssertion:
        """Apply a partial update, re-validating parameters against the type."""
        assertion_type_id = (
            fields["assertion_type_id"] if "assertion_type_id" in fields else assertion.assertion_type_id
        )
        parameters = fields["parameters"] if "parameters" in fields else assertion.parameters
        if "assertion_type_id" in fields or "parameters" in fields:
            validate_parameters(self._assertion_schema(assertion_type_id), parameters)
        return self.apply_update(assertion, fields)

    def soft_delete(self, assertion: JourneyScenarioStepAssertion) -> None:
        now = utc_now()
        self._disable(assertion, now)
        self.session.commit()
