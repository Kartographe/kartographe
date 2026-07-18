# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `application_route` table — an HTTP route exposed by an application.

Carries the request contract (method, path, accepted formats and the
query/header/body/raw schemas), the guards and roles that protect it (by id
arrays) and its validity window (start/end version).
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, ClassVar

from sqlalchemy import ARRAY, JSON, String, Uuid
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models._lockable import LockableMixin
from src.models._search import Searchable
from src.models.enum import ApplicationRouteMethod, ApplicationRouteStatus, SearchEntityType
from src.utils.tiptap import tiptap_to_text

if TYPE_CHECKING:
    from src.models.user import User


class ApplicationRoute(LockableMixin, BaseModel, Searchable, table=True):
    __tablename__ = "application_route"

    SEARCH_ENTITY_TYPE: ClassVar[SearchEntityType] = SearchEntityType.APPLICATION_ROUTE

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    application_id: uuid.UUID = Field(foreign_key="application.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    start_application_version_id: uuid.UUID | None = Field(
        default=None, foreign_key="application_version.id", index=True
    )
    end_application_version_id: uuid.UUID | None = Field(
        default=None, foreign_key="application_version.id", index=True
    )

    # Guards/roles protecting the route — validated against the application.
    application_guard_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))
    application_role_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))
    tag_ids: list[uuid.UUID] = Field(default_factory=list, sa_type=ARRAY(Uuid))

    date: datetime
    status: ApplicationRouteStatus = Field(index=True)
    status_date: datetime
    start_date: datetime | None = Field(default=None)
    end_date: datetime | None = Field(default=None)
    method: ApplicationRouteMethod = Field(index=True)
    title: str | None = Field(default=None)
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
    path: str = Field(index=True)
    accepted_format: list[str] = Field(default_factory=list, sa_type=ARRAY(String))
    query_params_schema: dict = Field(default_factory=dict, sa_type=JSON)
    header_schema: dict = Field(default_factory=dict, sa_type=JSON)
    body_schema: dict = Field(default_factory=dict, sa_type=JSON)
    raw_schema: dict = Field(default_factory=dict, sa_type=JSON)

    # Two FKs point at `user.id` (owner + locker), so each relationship must name
    # its own — SQLAlchemy can't infer which column feeds which.
    owner: "User" = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "foreign_keys": "[ApplicationRoute.owner_id]"}
    )
    locked_by: "User" = Relationship(
        sa_relationship_kwargs={"lazy": "selectin", "foreign_keys": "[ApplicationRoute.locked_by_id]"}
    )

    def search_vector(self) -> dict[str, list[str | None]]:
        return {"A": [self.title, self.path], "B": [tiptap_to_text(self.description)]}
