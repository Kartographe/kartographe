"""The `journey_scenario` table — a scenario (scénario) inside a journey."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, JSON, Uuid
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import JourneyScenarioCriticity, JourneyScenarioStatus, JourneyScenarioType

if TYPE_CHECKING:
    from src.models.user import User


class JourneyScenario(BaseModel, table=True):
    __tablename__ = "journey_scenario"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    journey_id: uuid.UUID = Field(foreign_key="journey.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    type: JourneyScenarioType = Field(index=True)
    status: JourneyScenarioStatus = Field(index=True)
    # Not listed in the spec's field list, but the scenario has an
    # activate/archive lifecycle, so it is stamped alongside `status`.
    status_date: datetime
    # Personas this scenario targets — validated against the account on write.
    personas_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))
    title: str
    criticity: JourneyScenarioCriticity = Field(index=True)
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
    tag_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))

    owner: "User" = Relationship()
