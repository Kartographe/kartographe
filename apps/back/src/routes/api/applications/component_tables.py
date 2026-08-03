# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../applications/{application_id}/components/{component_id}/tables`.

Links between a component and the account's database tables — which data a
building block works with, with an optional note on what it does with it. Reads
are open to any account member; writes are restricted to the dev roles. The
referenced database table must belong to the account.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms._bulk import BulkCreateRequest
from src.forms.application_components import (
    ApplicationComponentDatabaseTableCreateForm,
    ApplicationComponentDatabaseTablePatchForm,
)
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.application_components import ApplicationComponentDatabaseTableItem
from src.serializes.bulk import BulkCreateResponse
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    ApplicationComponentDatabaseTableManagerDep,
    CurrentAccountUserDep,
    CurrentApplicationComponentDatabaseTableDep,
    CurrentApplicationComponentDep,
    CurrentUserDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/components/{component_id}/tables",
    tags=["api.applications.components.tables"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Component, link or database table not found"}}

_DEV = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DEVELOPER,
)


@router.get(
    "",
    operation_id="api_applications_components_tables_list",
    summary="List component tables",
    description=(
        "List the database-table links of a component, in insertion order. Any member may read."
    ),
    response_model=ListingResponse[ApplicationComponentDatabaseTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_component_tables(
    _: CurrentAccountUserDep,
    component: CurrentApplicationComponentDep,
    manager: ApplicationComponentDatabaseTableManagerDep,
) -> ListingResponse[ApplicationComponentDatabaseTableItem]:
    return ListingResponse.single_page(
        manager.to_items(manager.list_for_component(component))
    )


@router.post(
    "",
    operation_id="api_applications_components_tables_create",
    summary="Link a database table",
    description=(
        "Link the component to a database table of the account, with an optional rich-text note "
        "on what the component does with it. Dev roles only."
    ),
    response_model=ItemResponse[ApplicationComponentDatabaseTableItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_component_table(
    form: ApplicationComponentDatabaseTableCreateForm,
    component: CurrentApplicationComponentDep,
    user: CurrentUserDep,
    manager: ApplicationComponentDatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationComponentDatabaseTableItem]:
    link = manager.create(
        component,
        user,
        database_table_id=form.database_table_id,
        description=form.description,
    )
    return ItemResponse(item=manager.to_item(link))


@router.post(
    "/bulk",
    operation_id="api_applications_components_tables_bulk_create",
    summary="Link several database tables at once",
    description=(
        "Link 1 to 50 database tables in a single call — prefer this over calling "
        "`api_applications_components_tables_create` in a loop when adding many. Best-effort: "
        "each link is created independently, so one failing item does not roll back the others. "
        "Always returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the single "
        "create. Dev roles only."
    ),
    response_model=BulkCreateResponse[ApplicationComponentDatabaseTableItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_component_tables(
    body: BulkCreateRequest[ApplicationComponentDatabaseTableCreateForm],
    component: CurrentApplicationComponentDep,
    user: CurrentUserDep,
    manager: ApplicationComponentDatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> BulkCreateResponse[ApplicationComponentDatabaseTableItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            component,
            user,
            database_table_id=form.database_table_id,
            description=form.description,
        ),
        serialize=manager.to_item,
    )


@router.get(
    "/{component_table_id}",
    operation_id="api_applications_components_tables_get",
    summary="Get a component table link",
    description="Return a single database-table link of the component. Any member may read.",
    response_model=ItemResponse[ApplicationComponentDatabaseTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_component_table(
    _: CurrentAccountUserDep, link: CurrentApplicationComponentDatabaseTableDep
) -> ItemResponse[ApplicationComponentDatabaseTableItem]:
    return ItemResponse(item=manager.to_item(link))


@router.patch(
    "/{component_table_id}",
    operation_id="api_applications_components_tables_update",
    summary="Update a component table link",
    description=(
        "Partially update a link (database table, description). A changed table must belong to "
        "the account. Dev roles only."
    ),
    response_model=ItemResponse[ApplicationComponentDatabaseTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_component_table(
    form: ApplicationComponentDatabaseTablePatchForm,
    component: CurrentApplicationComponentDep,
    link: CurrentApplicationComponentDatabaseTableDep,
    manager: ApplicationComponentDatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationComponentDatabaseTableItem]:
    updated = manager.update(component, link, form.model_dump(exclude_unset=True))
    return ItemResponse(item=manager.to_item(updated))


@router.delete(
    "/{component_table_id}",
    operation_id="api_applications_components_tables_delete",
    summary="Delete a component table link",
    description="Soft-delete a database-table link. Dev roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_component_table(
    link: CurrentApplicationComponentDatabaseTableDep,
    manager: ApplicationComponentDatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> None:
    manager.soft_delete(link)
