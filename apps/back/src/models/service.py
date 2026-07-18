# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `service` table — a service tracked inside an account."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, ClassVar

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models._lockable import LockableMixin
from src.models._search import Searchable
from src.models.enum import SearchEntityType, ServiceStatus, ServiceType
from src.utils.tiptap import tiptap_to_text

if TYPE_CHECKING:
    from src.models.user import User


class Service(LockableMixin, BaseModel, Searchable, table=True):
    __tablename__ = "service"

    SEARCH_ENTITY_TYPE: ClassVar[SearchEntityType] = SearchEntityType.SERVICE

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    type: ServiceType = Field(index=True)
    status: ServiceStatus = Field(index=True)
    status_date: datetime
    title: str
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
    picture_path: str | None = Field(default=None)
    url: str | None = Field(default=None)
    openapi_url: str | None = Field(default=None)

    # Two FKs point at `user.id` (owner + locker), so each relationship must name
    # its own — SQLAlchemy can't infer which column feeds which.
    owner: "User" = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "foreign_keys": "[Service.owner_id]"}
    )
    locked_by: "User" = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "foreign_keys": "[Service.locked_by_id]"}
    )

    def search_vector(self) -> dict[str, list[str | None]]:
        return {"A": [self.title], "B": [tiptap_to_text(self.description)]}
