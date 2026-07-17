# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `journey_scenario_step_file` table — a file attached to a step."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import JourneyScenarioStepFileStatus, JourneyScenarioStepFileType

if TYPE_CHECKING:
    from src.models.user import User


class JourneyScenarioStepFile(BaseModel, table=True):
    __tablename__ = "journey_scenario_step_file"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    journey_id: uuid.UUID = Field(foreign_key="journey.id", index=True)
    journey_scenario_id: uuid.UUID = Field(foreign_key="journey_scenario.id", index=True)
    journey_scenario_step_id: uuid.UUID = Field(foreign_key="journey_scenario_step.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    type: JourneyScenarioStepFileType = Field(index=True)
    status: JourneyScenarioStepFileStatus = Field(index=True)
    status_date: datetime
    name: str
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
    file_name: str
    file_size: int
    file_extension: str
    file_path: str

    owner: "User" = Relationship(sa_relationship_kwargs={"lazy": "selectin"})
