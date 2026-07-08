"""The `application_route_example` table — a request/response example of a route."""

import uuid

from sqlalchemy import JSON
from sqlmodel import Field

from src.models._base import BaseModel


class ApplicationRouteExample(BaseModel, table=True):
    __tablename__ = "application_route_example"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    application_id: uuid.UUID = Field(foreign_key="application.id", index=True)
    application_route_id: uuid.UUID = Field(foreign_key="application_route.id", index=True)
    application_route_response_id: uuid.UUID = Field(
        foreign_key="application_route_response.id", index=True
    )

    query_params: dict = Field(default_factory=dict, sa_type=JSON)
    headers: dict = Field(default_factory=dict, sa_type=JSON)
    body: dict = Field(default_factory=dict, sa_type=JSON)
    raw: dict = Field(default_factory=dict, sa_type=JSON)
    response: dict = Field(default_factory=dict, sa_type=JSON)
