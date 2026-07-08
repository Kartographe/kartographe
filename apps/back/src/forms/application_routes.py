"""Input schemas for application guards, roles, routes and their responses,
examples and table links."""

import uuid
from datetime import datetime

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import (
    ApplicationGuardFieldFormat,
    ApplicationGuardFieldType,
    ApplicationGuardType,
    ApplicationRouteMethod,
    ApplicationRouteResponseFormat,
    ApplicationRouteTableAction,
    ApplicationRouteTableType,
)

# --- ApplicationGuard ----------------------------------------------------


class ApplicationGuardCreateForm(CamelBase):
    """Create an authentication guard. It starts as a draft owned by the caller."""

    type: ApplicationGuardType
    title: str = Field(min_length=1, max_length=255)
    field_type: ApplicationGuardFieldType
    field_key: str = Field(min_length=1, max_length=255)
    field_format: ApplicationGuardFieldFormat | None = Field(default=None)


class ApplicationGuardPatchForm(CamelBase):
    """Partial update of a guard — only the keys sent are applied."""

    type: ApplicationGuardType | None = Field(default=None)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    field_type: ApplicationGuardFieldType | None = Field(default=None)
    field_key: str | None = Field(default=None, min_length=1, max_length=255)
    field_format: ApplicationGuardFieldFormat | None = Field(default=None)


# --- ApplicationRole -----------------------------------------------------


class ApplicationRoleCreateForm(CamelBase):
    """Create an authorization role. It starts as a draft owned by the caller."""

    title: str = Field(min_length=1, max_length=255)
    description: dict | None = Field(default=None)


class ApplicationRolePatchForm(CamelBase):
    """Partial update of a role — only the keys sent are applied."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)


# --- ApplicationRoute ----------------------------------------------------


class ApplicationRouteCreateForm(CamelBase):
    """Create a route. It starts as a draft owned by the caller. Guards and roles
    must belong to the same application."""

    method: ApplicationRouteMethod
    path: str = Field(min_length=1, max_length=2048)
    title: str | None = Field(default=None, max_length=255)
    description: dict | None = Field(default=None)
    application_guard_ids: list[uuid.UUID] = Field(default_factory=list)
    application_role_ids: list[uuid.UUID] = Field(default_factory=list)
    start_date: datetime | None = Field(default=None)
    start_application_version_id: uuid.UUID | None = Field(default=None)
    end_date: datetime | None = Field(default=None)
    end_application_version_id: uuid.UUID | None = Field(default=None)
    accepted_format: list[str] = Field(default_factory=list)
    query_params_schema: dict = Field(default_factory=dict)
    header_schema: dict = Field(default_factory=dict)
    body_schema: dict = Field(default_factory=dict)
    raw_schema: dict = Field(default_factory=dict)


class ApplicationRoutePatchForm(CamelBase):
    """Partial update of a route — only the keys sent are applied."""

    method: ApplicationRouteMethod | None = Field(default=None)
    path: str | None = Field(default=None, min_length=1, max_length=2048)
    title: str | None = Field(default=None, max_length=255)
    description: dict | None = Field(default=None)
    application_guard_ids: list[uuid.UUID] | None = Field(default=None)
    application_role_ids: list[uuid.UUID] | None = Field(default=None)
    start_date: datetime | None = Field(default=None)
    start_application_version_id: uuid.UUID | None = Field(default=None)
    end_date: datetime | None = Field(default=None)
    end_application_version_id: uuid.UUID | None = Field(default=None)
    accepted_format: list[str] | None = Field(default=None)
    query_params_schema: dict | None = Field(default=None)
    header_schema: dict | None = Field(default=None)
    body_schema: dict | None = Field(default=None)
    raw_schema: dict | None = Field(default=None)


# --- ApplicationRouteResponse --------------------------------------------


class ApplicationRouteResponseCreateForm(CamelBase):
    """Create a documented response of a route."""

    status_code: int = Field(ge=100, le=599)
    format: ApplicationRouteResponseFormat
    body_schema: dict = Field(default_factory=dict)


class ApplicationRouteResponsePatchForm(CamelBase):
    """Partial update of a response — only the keys sent are applied."""

    status_code: int | None = Field(default=None, ge=100, le=599)
    format: ApplicationRouteResponseFormat | None = Field(default=None)
    body_schema: dict | None = Field(default=None)


# --- ApplicationRouteExample ---------------------------------------------


class ApplicationRouteExampleCreateForm(CamelBase):
    """Create a request/response example. The response must belong to the route."""

    application_route_response_id: uuid.UUID
    query_params: dict = Field(default_factory=dict)
    headers: dict = Field(default_factory=dict)
    body: dict = Field(default_factory=dict)
    raw: dict = Field(default_factory=dict)
    response: dict = Field(default_factory=dict)


class ApplicationRouteExamplePatchForm(CamelBase):
    """Partial update of an example — only the keys sent are applied."""

    application_route_response_id: uuid.UUID | None = Field(default=None)
    query_params: dict | None = Field(default=None)
    headers: dict | None = Field(default=None)
    body: dict | None = Field(default=None)
    raw: dict | None = Field(default=None)
    response: dict | None = Field(default=None)


# --- ApplicationRouteTable -----------------------------------------------


class ApplicationRouteTableCreateForm(CamelBase):
    """Link a route to a database table. The table must belong to the account."""

    database_table_id: uuid.UUID
    type: ApplicationRouteTableType
    action: ApplicationRouteTableAction


class ApplicationRouteTablePatchForm(CamelBase):
    """Partial update of a route/table link — only the keys sent are applied."""

    database_table_id: uuid.UUID | None = Field(default=None)
    type: ApplicationRouteTableType | None = Field(default=None)
    action: ApplicationRouteTableAction | None = Field(default=None)
