# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/applications/{application_id}/routes`.

HTTP routes exposed by an application. Reads are open to any account member;
writes are restricted to the dev roles. Referenced guards, roles and versions
must belong to the application. Deleting a route cascades a soft-delete to its
responses, examples and table links.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.forms.application_routes import ApplicationRouteCreateForm, ApplicationRoutePatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.application_routes import ApplicationRouteItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    ApplicationRouteManagerDep,
    CurrentAccountUserDep,
    CurrentApplicationDep,
    CurrentApplicationRouteDep,
    CurrentUserDep,
    TagManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/routes",
    tags=["api.applications.routes"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Application, route, guard, role or version not found"}}

_DEV = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DEVELOPER,
)


@router.get(
    "",
    operation_id="api_applications_routes_list",
    summary="List routes",
    description=(
        "List the routes of an application, most recent first. Any member may read. "
        "Filter with `tagIds` (repeat the query param) to keep only the entities carrying at least one of those tags."
    ),
    response_model=ListingResponse[ApplicationRouteItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_routes(
    _: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: ApplicationRouteManagerDep,
    tags: TagManagerDep,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
) -> ListingResponse[ApplicationRouteItem]:
    rows = manager.list_for_application(application, tag_ids=tag_ids)
    items = tags.attach(rows, ApplicationRouteItem)
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_applications_routes_create",
    summary="Create a route",
    description=(
        "Create a route. It starts as a draft owned by the caller. Referenced guards, roles and "
        "versions must belong to the application. Dev roles only."
    ),
    response_model=ItemResponse[ApplicationRouteItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_route(
    form: ApplicationRouteCreateForm,
    application: CurrentApplicationDep,
    user: CurrentUserDep,
    manager: ApplicationRouteManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationRouteItem]:
    route = manager.create(
        application,
        user,
        method=form.method,
        path=form.path,
        title=form.title,
        description=form.description,
        application_guard_ids=form.application_guard_ids,
        application_role_ids=form.application_role_ids,
        start_date=form.start_date,
        start_application_version_id=form.start_application_version_id,
        end_date=form.end_date,
        end_application_version_id=form.end_application_version_id,
        accepted_format=form.accepted_format,
        query_params_schema=form.query_params_schema,
        header_schema=form.header_schema,
        body_schema=form.body_schema,
        raw_schema=form.raw_schema,
        tag_ids=form.tag_ids,
    )
    return ItemResponse(item=ApplicationRouteItem.model_validate(route))


@router.get(
    "/{route_id}",
    operation_id="api_applications_routes_get",
    summary="Get a route",
    description="Return a single route of the application. Any member may read.",
    response_model=ItemResponse[ApplicationRouteItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_route(
    _: CurrentAccountUserDep, route: CurrentApplicationRouteDep, tags: TagManagerDep
) -> ItemResponse[ApplicationRouteItem]:
    return ItemResponse(item=tags.attach_one(route, ApplicationRouteItem))


@router.patch(
    "/{route_id}",
    operation_id="api_applications_routes_update",
    summary="Update a route",
    description=(
        "Partially update a route. Referenced guards, roles and versions must belong to the "
        "application. Dev roles only."
    ),
    response_model=ItemResponse[ApplicationRouteItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_route(
    form: ApplicationRoutePatchForm,
    application: CurrentApplicationDep,
    route: CurrentApplicationRouteDep,
    manager: ApplicationRouteManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationRouteItem]:
    updated = manager.update(application, route, form.model_dump(exclude_unset=True))
    return ItemResponse(item=ApplicationRouteItem.model_validate(updated))


@router.delete(
    "/{route_id}",
    operation_id="api_applications_routes_delete",
    summary="Delete a route",
    description=(
        "Soft-delete a route; its responses, examples and table links are soft-deleted as well. "
        "Dev roles only."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_route(
    route: CurrentApplicationRouteDep,
    manager: ApplicationRouteManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> None:
    manager.soft_delete(route)
