# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `application_route_response` table — a documented response of a route."""

import uuid

from sqlalchemy import JSON
from sqlmodel import Field

from src.models._base import BaseModel
from src.models.enum import ApplicationRouteResponseFormat


class ApplicationRouteResponse(BaseModel, table=True):
    __tablename__ = "application_route_response"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    application_id: uuid.UUID = Field(foreign_key="application.id", index=True)
    application_route_id: uuid.UUID = Field(foreign_key="application_route.id", index=True)

    status_code: int
    format: ApplicationRouteResponseFormat = Field(index=True)
    body_schema: dict = Field(default_factory=dict, sa_type=JSON)
