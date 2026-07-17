# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `journey_scenario_step_route` table — a step linked to an app route.

Junction connecting a scenario step to an `ApplicationRoute` it exercises.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship

from src.models._base import BaseModel

if TYPE_CHECKING:
    from src.models.user import User


class JourneyScenarioStepRoute(BaseModel, table=True):
    __tablename__ = "journey_scenario_step_route"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    journey_id: uuid.UUID = Field(foreign_key="journey.id", index=True)
    journey_scenario_id: uuid.UUID = Field(foreign_key="journey_scenario.id", index=True)
    journey_scenario_step_id: uuid.UUID = Field(foreign_key="journey_scenario_step.id", index=True)
    application_id: uuid.UUID = Field(foreign_key="application.id", index=True)
    application_route_id: uuid.UUID = Field(foreign_key="application_route.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime

    owner: "User" = Relationship(sa_relationship_kwargs={"lazy": "selectin"})
