# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `feature_journey` table — a journey linked to a feature.

Junction between an account `Feature` and a `Journey` of the same account.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship

from src.models._base import BaseModel

if TYPE_CHECKING:
    from src.models.feature import Feature
    from src.models.journey import Journey
    from src.models.user import User


class FeatureJourney(BaseModel, table=True):
    __tablename__ = "feature_journey"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    feature_id: uuid.UUID = Field(foreign_key="feature.id", index=True)
    journey_id: uuid.UUID = Field(foreign_key="journey.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime

    owner: "User" = Relationship(sa_relationship_kwargs={"lazy": "selectin"})
    # Both ends are eager-loaded: a link is only ever read to be displayed, and
    # what it must show (title, type, status) lives on the entities, not here.
    feature: "Feature" = Relationship(sa_relationship_kwargs={"lazy": "selectin"})
    journey: "Journey" = Relationship(sa_relationship_kwargs={"lazy": "selectin"})
