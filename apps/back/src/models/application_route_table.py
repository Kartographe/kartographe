# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `application_route_table` table — a link between a route and a DB table.

Records which database table a route reads or writes, and through which part of
the exchange (query params/data/header or response data/header).
"""

import uuid

from sqlmodel import Field

from src.models._base import BaseModel
from src.models.enum import ApplicationRouteTableAction, ApplicationRouteTableType


class ApplicationRouteTable(BaseModel, table=True):
    __tablename__ = "application_route_table"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    application_id: uuid.UUID = Field(foreign_key="application.id", index=True)
    application_route_id: uuid.UUID = Field(foreign_key="application_route.id", index=True)
    database_table_id: uuid.UUID = Field(foreign_key="database_table.id", index=True)

    type: ApplicationRouteTableType = Field(index=True)
    action: ApplicationRouteTableAction = Field(index=True)
