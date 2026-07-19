# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../applications/{application_id}/routes/{route_id}/tables`.

Links between a route and the account's database tables. Reads are open to any
account member; writes are restricted to the dev roles. The referenced database
table must belong to the account.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms._bulk import BulkCreateRequest
from src.forms.application_routes import (
    ApplicationRouteTableCreateForm,
    ApplicationRouteTablePatchForm,
)
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.application_routes import ApplicationRouteTableItem
from src.serializes.bulk import BulkCreateResponse
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    ApplicationRouteTableManagerDep,
    CurrentAccountUserDep,
    CurrentApplicationRouteDep,
    CurrentApplicationRouteTableDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/routes/{route_id}/tables",
    tags=["api.applications.routes.tables"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Route, link or database table not found"}}

_DEV = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DEVELOPER,
)


@router.get(
    "",
    operation_id="api_applications_routes_tables_list",
    summary="List route tables",
    description="List the database-table links of a route, in insertion order. Any member may read.",
    response_model=ListingResponse[ApplicationRouteTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_route_tables(
    _: CurrentAccountUserDep,
    route: CurrentApplicationRouteDep,
    manager: ApplicationRouteTableManagerDep,
) -> ListingResponse[ApplicationRouteTableItem]:
    items = [ApplicationRouteTableItem.model_validate(row) for row in manager.list_for_route(route)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_applications_routes_tables_create",
    summary="Link a database table",
    description=(
        "Link the route to a database table of the account, recording the exchange part and the "
        "action performed. Dev roles only."
    ),
    response_model=ItemResponse[ApplicationRouteTableItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_route_table(
    form: ApplicationRouteTableCreateForm,
    route: CurrentApplicationRouteDep,
    manager: ApplicationRouteTableManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationRouteTableItem]:
    link = manager.create(
        route, database_table_id=form.database_table_id, type=form.type, action=form.action
    )
    return ItemResponse(item=ApplicationRouteTableItem.model_validate(link))


@router.post(
    "/bulk",
    operation_id="api_applications_routes_tables_bulk_create",
    summary="Link several database tables at once",
    description=(
        "Link 1 to 50 database tables in a single call — prefer this over calling "
        "`api_applications_routes_tables_create` in a loop when adding many. Best-effort: each "
        "link is created independently, so one failing item does not roll back the others. "
        "Always returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the "
        "single create. Dev roles only."
    ),
    response_model=BulkCreateResponse[ApplicationRouteTableItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_route_tables(
    body: BulkCreateRequest[ApplicationRouteTableCreateForm],
    route: CurrentApplicationRouteDep,
    manager: ApplicationRouteTableManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> BulkCreateResponse[ApplicationRouteTableItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            route, database_table_id=form.database_table_id, type=form.type, action=form.action
        ),
        serialize=ApplicationRouteTableItem.model_validate,
    )


@router.get(
    "/{route_table_id}",
    operation_id="api_applications_routes_tables_get",
    summary="Get a route table link",
    description="Return a single database-table link of the route. Any member may read.",
    response_model=ItemResponse[ApplicationRouteTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_route_table(
    _: CurrentAccountUserDep, link: CurrentApplicationRouteTableDep
) -> ItemResponse[ApplicationRouteTableItem]:
    return ItemResponse(item=ApplicationRouteTableItem.model_validate(link))


@router.patch(
    "/{route_table_id}",
    operation_id="api_applications_routes_tables_update",
    summary="Update a route table link",
    description=(
        "Partially update a link (database table, type, action). A changed table must belong to "
        "the account. Dev roles only."
    ),
    response_model=ItemResponse[ApplicationRouteTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_route_table(
    form: ApplicationRouteTablePatchForm,
    route: CurrentApplicationRouteDep,
    link: CurrentApplicationRouteTableDep,
    manager: ApplicationRouteTableManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationRouteTableItem]:
    updated = manager.update(route, link, form.model_dump(exclude_unset=True))
    return ItemResponse(item=ApplicationRouteTableItem.model_validate(updated))


@router.delete(
    "/{route_table_id}",
    operation_id="api_applications_routes_tables_delete",
    summary="Delete a route table link",
    description="Soft-delete a database-table link. Dev roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_route_table(
    link: CurrentApplicationRouteTableDep,
    manager: ApplicationRouteTableManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> None:
    manager.soft_delete(link)
