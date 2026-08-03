# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `application_component_database_table` table — a component ↔ DB table link.

Records which database tables a component of an application works with, with an
optional rich-text note on what it does with them. `application_id` is carried
alongside the component id: it is the component's, denormalised so the account's
links can be filtered per application without a join.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel

if TYPE_CHECKING:
    from src.models.user import User


class ApplicationComponentDatabaseTable(BaseModel, table=True):
    __tablename__ = "application_component_database_table"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    application_id: uuid.UUID = Field(foreign_key="application.id", index=True)
    application_component_id: uuid.UUID = Field(
        foreign_key="application_component.id", index=True
    )
    database_table_id: uuid.UUID = Field(foreign_key="database_table.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    # Rich-text (Tiptap JSON document), optional — what the component does with
    # the table.
    description: dict | None = Field(default=None, sa_type=JSON)

    owner: "User" = Relationship(sa_relationship_kwargs={"lazy": "selectin"})
