"""`.../applications/{application_id}/routes/{route_id}/tables`.

Links between a route and the account's database tables. Reads are open to any
account member; writes are restricted to the dev roles. The referenced database
table must belong to the account.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.application_routes import (
    ApplicationRouteTableCreateForm,
    ApplicationRouteTablePatchForm,
)
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.application_routes import ApplicationRouteTableItem
from src.serializes.errors import ErrorResponse
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
    operation_id="api.applications.routes.tables.list",
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
    operation_id="api.applications.routes.tables.create",
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


@router.get(
    "/{route_table_id}",
    operation_id="api.applications.routes.tables.get",
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
    operation_id="api.applications.routes.tables.update",
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
    operation_id="api.applications.routes.tables.delete",
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
