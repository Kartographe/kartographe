# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../applications/{application_id}/routes/{route_id}/examples`.

Request/response examples of a route. Reads are open to any account member;
writes are restricted to the dev roles. An example references a response of the
same route.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms._bulk import BulkCreateRequest
from src.forms.application_routes import (
    ApplicationRouteExampleCreateForm,
    ApplicationRouteExamplePatchForm,
)
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.application_routes import ApplicationRouteExampleItem
from src.serializes.bulk import BulkCreateResponse
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    ApplicationRouteExampleManagerDep,
    CurrentAccountUserDep,
    CurrentApplicationRouteDep,
    CurrentApplicationRouteExampleDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/routes/{route_id}/examples",
    tags=["api.applications.routes.examples"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Route, example or response not found"}}

_DEV = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DEVELOPER,
)


@router.get(
    "",
    operation_id="api_applications_routes_examples_list",
    summary="List route examples",
    description="List the examples of a route, in insertion order. Any member may read.",
    response_model=ListingResponse[ApplicationRouteExampleItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_examples(
    _: CurrentAccountUserDep,
    route: CurrentApplicationRouteDep,
    manager: ApplicationRouteExampleManagerDep,
) -> ListingResponse[ApplicationRouteExampleItem]:
    items = [ApplicationRouteExampleItem.model_validate(row) for row in manager.list_for_route(route)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_applications_routes_examples_create",
    summary="Create a route example",
    description=(
        "Create a request/response example. The referenced response must belong to the route. "
        "Dev roles only."
    ),
    response_model=ItemResponse[ApplicationRouteExampleItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_example(
    form: ApplicationRouteExampleCreateForm,
    route: CurrentApplicationRouteDep,
    manager: ApplicationRouteExampleManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationRouteExampleItem]:
    example = manager.create(
        route,
        application_route_response_id=form.application_route_response_id,
        query_params=form.query_params,
        headers=form.headers,
        body=form.body,
        raw=form.raw,
        response=form.response,
    )
    return ItemResponse(item=ApplicationRouteExampleItem.model_validate(example))


@router.post(
    "/bulk",
    operation_id="api_applications_routes_examples_bulk_create",
    summary="Create several route examples at once",
    description=(
        "Create 1 to 50 request/response examples in a single call — prefer this over calling "
        "`api_applications_routes_examples_create` in a loop when adding many. Best-effort: each "
        "example is created independently, so one failing item does not roll back the others. "
        "Always returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the "
        "single create. The referenced response must belong to the route. Dev roles only."
    ),
    response_model=BulkCreateResponse[ApplicationRouteExampleItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_examples(
    body: BulkCreateRequest[ApplicationRouteExampleCreateForm],
    route: CurrentApplicationRouteDep,
    manager: ApplicationRouteExampleManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> BulkCreateResponse[ApplicationRouteExampleItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            route,
            application_route_response_id=form.application_route_response_id,
            query_params=form.query_params,
            headers=form.headers,
            body=form.body,
            raw=form.raw,
            response=form.response,
        ),
        serialize=ApplicationRouteExampleItem.model_validate,
    )


@router.get(
    "/{example_id}",
    operation_id="api_applications_routes_examples_get",
    summary="Get a route example",
    description="Return a single example of the route. Any member may read.",
    response_model=ItemResponse[ApplicationRouteExampleItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_example(
    _: CurrentAccountUserDep, example: CurrentApplicationRouteExampleDep
) -> ItemResponse[ApplicationRouteExampleItem]:
    return ItemResponse(item=ApplicationRouteExampleItem.model_validate(example))


@router.patch(
    "/{example_id}",
    operation_id="api_applications_routes_examples_update",
    summary="Update a route example",
    description=(
        "Partially update an example. A changed response reference must belong to the route. "
        "Dev roles only."
    ),
    response_model=ItemResponse[ApplicationRouteExampleItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_example(
    form: ApplicationRouteExamplePatchForm,
    route: CurrentApplicationRouteDep,
    example: CurrentApplicationRouteExampleDep,
    manager: ApplicationRouteExampleManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationRouteExampleItem]:
    updated = manager.update(route, example, form.model_dump(exclude_unset=True))
    return ItemResponse(item=ApplicationRouteExampleItem.model_validate(updated))


@router.delete(
    "/{example_id}",
    operation_id="api_applications_routes_examples_delete",
    summary="Delete a route example",
    description="Soft-delete an example. Dev roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_example(
    example: CurrentApplicationRouteExampleDep,
    manager: ApplicationRouteExampleManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> None:
    manager.soft_delete(example)
