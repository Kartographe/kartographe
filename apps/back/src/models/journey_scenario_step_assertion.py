"""The `journey_scenario_step_assertion` table — an assertion on a step."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import JourneyScenarioStepAssertionStatus

if TYPE_CHECKING:
    from src.models.assertion_type import AssertionType
    from src.models.user import User


class JourneyScenarioStepAssertion(BaseModel, table=True):
    __tablename__ = "journey_scenario_step_assertion"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    journey_id: uuid.UUID = Field(foreign_key="journey.id", index=True)
    journey_scenario_id: uuid.UUID = Field(foreign_key="journey_scenario.id", index=True)
    journey_scenario_step_id: uuid.UUID = Field(foreign_key="journey_scenario_step.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    assertion_type_id: uuid.UUID = Field(foreign_key="assertion_type.id", index=True)

    date: datetime
    status: JourneyScenarioStepAssertionStatus = Field(index=True)
    status_date: datetime
    # Values for the assertion, shaped by `assertion_type.parameter_schema`.
    parameters: dict = Field(default_factory=dict, sa_type=JSON)

    assertion_type: "AssertionType" = Relationship()
