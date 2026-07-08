"""The `journey_scenario_step` table — a step (étape) inside a scenario.

Steps form a tree via the optional self-referential
`parent_journey_scenario_step_id`. A step may carry an action
(`action_type_id`) whose `parameters` follow the action's `parameter_schema`.
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel

if TYPE_CHECKING:
    from src.models.action_type import ActionType


class JourneyScenarioStep(BaseModel, table=True):
    __tablename__ = "journey_scenario_step"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    journey_id: uuid.UUID = Field(foreign_key="journey.id", index=True)
    journey_scenario_id: uuid.UUID = Field(foreign_key="journey_scenario.id", index=True)
    parent_journey_scenario_step_id: uuid.UUID | None = Field(
        default=None, foreign_key="journey_scenario_step.id", index=True
    )
    action_type_id: uuid.UUID | None = Field(
        default=None, foreign_key="action_type.id", index=True
    )

    title: str
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
    optional: bool = Field(default=False)
    # Values for the action, shaped by `action_type.parameter_schema`.
    parameters: dict = Field(default_factory=dict, sa_type=JSON)

    action_type: "ActionType" = Relationship()
