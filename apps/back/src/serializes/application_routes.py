"""Output schemas for application guards, roles, routes and their responses,
examples and table links."""

import uuid
from datetime import datetime

from src.models.enum import (
    ApplicationGuardFieldFormat,
    ApplicationGuardFieldType,
    ApplicationGuardStatus,
    ApplicationGuardType,
    ApplicationRoleStatus,
    ApplicationRouteMethod,
    ApplicationRouteResponseFormat,
    ApplicationRouteStatus,
    ApplicationRouteTableAction,
    ApplicationRouteTableType,
)
from src.serializes._base import CamelBase
from src.serializes.tags import TagItem


class ApplicationGuardItem(CamelBase):
    """An authentication guard of an application."""

    date: datetime
    field_format: ApplicationGuardFieldFormat | None = None
    field_key: str
    field_type: ApplicationGuardFieldType
    id: uuid.UUID
    owner_id: uuid.UUID
    status: ApplicationGuardStatus
    status_date: datetime
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    title: str
    type: ApplicationGuardType


class ApplicationRoleItem(CamelBase):
    """An authorization role of an application."""

    date: datetime
    description: dict | None = None
    id: uuid.UUID
    owner_id: uuid.UUID
    status: ApplicationRoleStatus
    status_date: datetime
    title: str


class ApplicationRouteItem(CamelBase):
    """An HTTP route exposed by an application."""

    accepted_format: list[str]
    application_guard_ids: list[uuid.UUID]
    application_role_ids: list[uuid.UUID]
    body_schema: dict
    date: datetime
    description: dict | None = None
    end_application_version_id: uuid.UUID | None = None
    end_date: datetime | None = None
    header_schema: dict
    id: uuid.UUID
    method: ApplicationRouteMethod
    owner_id: uuid.UUID
    path: str
    query_params_schema: dict
    raw_schema: dict
    start_application_version_id: uuid.UUID | None = None
    start_date: datetime | None = None
    status: ApplicationRouteStatus
    status_date: datetime
    tag_ids: list[uuid.UUID]
    tags: list[TagItem] = []
    title: str | None = None


class ApplicationRouteResponseItem(CamelBase):
    """A documented response of a route."""

    body_schema: dict
    format: ApplicationRouteResponseFormat
    id: uuid.UUID
    status_code: int


class ApplicationRouteExampleItem(CamelBase):
    """A request/response example of a route."""

    application_route_response_id: uuid.UUID
    body: dict
    headers: dict
    id: uuid.UUID
    query_params: dict
    raw: dict
    response: dict


class ApplicationRouteTableItem(CamelBase):
    """A link between a route and a database table."""

    action: ApplicationRouteTableAction
    database_table_id: uuid.UUID
    id: uuid.UUID
    type: ApplicationRouteTableType
