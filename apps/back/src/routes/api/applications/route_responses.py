# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../applications/{application_id}/routes/{route_id}/responses`.

Documented responses of a route. Reads are open to any account member; writes
are restricted to the dev roles. Deleting a response also deletes the examples
that reference it.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms._bulk import BulkCreateRequest
from src.forms.application_routes import (
    ApplicationRouteResponseCreateForm,
    ApplicationRouteResponsePatchForm,
)
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.application_routes import ApplicationRouteResponseItem
from src.serializes.bulk import BulkCreateResponse
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    ApplicationRouteResponseManagerDep,
    CurrentAccountUserDep,
    CurrentApplicationRouteDep,
    CurrentApplicationRouteResponseDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/routes/{route_id}/responses",
    tags=["api.applications.routes.responses"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Route or response not found"}}

_DEV = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DEVELOPER,
)


@router.get(
    "",
    operation_id="api_applications_routes_responses_list",
    summary="List route responses",
    description="List the documented responses of a route, in insertion order. Any member may read.",
    response_model=ListingResponse[ApplicationRouteResponseItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_responses(
    _: CurrentAccountUserDep,
    route: CurrentApplicationRouteDep,
    manager: ApplicationRouteResponseManagerDep,
) -> ListingResponse[ApplicationRouteResponseItem]:
    items = [ApplicationRouteResponseItem.model_validate(row) for row in manager.list_for_route(route)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_applications_routes_responses_create",
    summary="Create a route response",
    description="Document a response of the route (status code, format, body schema). Dev roles only.",
    response_model=ItemResponse[ApplicationRouteResponseItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_response(
    form: ApplicationRouteResponseCreateForm,
    route: CurrentApplicationRouteDep,
    manager: ApplicationRouteResponseManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationRouteResponseItem]:
    response = manager.create(
        route, status_code=form.status_code, format=form.format, body_schema=form.body_schema
    )
    return ItemResponse(item=ApplicationRouteResponseItem.model_validate(response))


@router.post(
    "/bulk",
    operation_id="api_applications_routes_responses_bulk_create",
    summary="Create several route responses at once",
    description=(
        "Create 1 to 50 documented responses in a single call — prefer this over calling "
        "`api_applications_routes_responses_create` in a loop when adding many. Best-effort: each "
        "response is created independently, so one failing item does not roll back the others. "
        "Always returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the "
        "single create. Dev roles only."
    ),
    response_model=BulkCreateResponse[ApplicationRouteResponseItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_responses(
    body: BulkCreateRequest[ApplicationRouteResponseCreateForm],
    route: CurrentApplicationRouteDep,
    manager: ApplicationRouteResponseManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> BulkCreateResponse[ApplicationRouteResponseItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            route, status_code=form.status_code, format=form.format, body_schema=form.body_schema
        ),
        serialize=ApplicationRouteResponseItem.model_validate,
    )


@router.get(
    "/{response_id}",
    operation_id="api_applications_routes_responses_get",
    summary="Get a route response",
    description="Return a single response of the route. Any member may read.",
    response_model=ItemResponse[ApplicationRouteResponseItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_response(
    _: CurrentAccountUserDep, response: CurrentApplicationRouteResponseDep
) -> ItemResponse[ApplicationRouteResponseItem]:
    return ItemResponse(item=ApplicationRouteResponseItem.model_validate(response))


@router.patch(
    "/{response_id}",
    operation_id="api_applications_routes_responses_update",
    summary="Update a route response",
    description="Partially update a response (status code, format, body schema). Dev roles only.",
    response_model=ItemResponse[ApplicationRouteResponseItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_response(
    form: ApplicationRouteResponsePatchForm,
    response: CurrentApplicationRouteResponseDep,
    manager: ApplicationRouteResponseManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationRouteResponseItem]:
    updated = manager.apply_update(response, form.model_dump(exclude_unset=True))
    return ItemResponse(item=ApplicationRouteResponseItem.model_validate(updated))


@router.delete(
    "/{response_id}",
    operation_id="api_applications_routes_responses_delete",
    summary="Delete a route response",
    description="Soft-delete a response and the examples that reference it. Dev roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_response(
    response: CurrentApplicationRouteResponseDep,
    manager: ApplicationRouteResponseManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> None:
    manager.soft_delete(response)
