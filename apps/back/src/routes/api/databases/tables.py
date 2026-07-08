"""`.../databases/{database_id}/versions/{database_version_id}/tables`.

Tables of a database version. Reads are open to any account member; writes are
restricted to the data roles. A table can be created with its columns in one
call, and a table update that sends `columns` fully replaces them. Deleting a
table cascades to its columns.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.databases import DatabaseTableCreateForm, DatabaseTablePatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, DatabaseTableStatus
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.databases import DatabaseTableItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentDatabaseTableDep,
    CurrentDatabaseVersionDep,
    CurrentUserDep,
    DatabaseTableManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
    tags=["api.databases.versions.tables"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Version, table or column type not found"}}

_DATA = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DATA_ANALYST,
)


@router.get(
    "",
    operation_id="api.databases.versions.tables.list",
    summary="List tables",
    description="List the tables of a database version, most recent first. Any member may read.",
    response_model=ListingResponse[DatabaseTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_tables(
    _: CurrentAccountUserDep,
    version: CurrentDatabaseVersionDep,
    manager: DatabaseTableManagerDep,
) -> ListingResponse[DatabaseTableItem]:
    items = [manager.to_item(row) for row in manager.list_for_version(version)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api.databases.versions.tables.create",
    summary="Create a table",
    description=(
        "Create a table, optionally with its columns in one call. Each column references a "
        "catalogued column type and may model a foreign key. Data roles only."
    ),
    response_model=ItemResponse[DatabaseTableItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_table(
    form: DatabaseTableCreateForm,
    version: CurrentDatabaseVersionDep,
    user: CurrentUserDep,
    manager: DatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseTableItem]:
    table = manager.create(
        version,
        user,
        type=form.type,
        schema=form.schema,
        name=form.name,
        description=form.description,
        column_forms=form.columns,
    )
    return ItemResponse(item=manager.to_item(table, with_columns=True))


@router.get(
    "/{database_table_id}",
    operation_id="api.databases.versions.tables.get",
    summary="Get a table",
    description="Return a single table of the version, including its columns. Any member may read.",
    response_model=ItemResponse[DatabaseTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_table(
    _: CurrentAccountUserDep,
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableManagerDep,
) -> ItemResponse[DatabaseTableItem]:
    return ItemResponse(item=manager.to_item(table, with_columns=True))


@router.patch(
    "/{database_table_id}",
    operation_id="api.databases.versions.tables.update",
    summary="Update a table",
    description=(
        "Partially update a table (type, schema, name, description). If `columns` is sent, it "
        "fully replaces the table's columns. Data roles only."
    ),
    response_model=ItemResponse[DatabaseTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_table(
    form: DatabaseTablePatchForm,
    table: CurrentDatabaseTableDep,
    user: CurrentUserDep,
    manager: DatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseTableItem]:
    sent = form.model_dump(exclude_unset=True)
    scalar_fields = {key: value for key, value in sent.items() if key != "columns"}
    column_forms = form.columns if "columns" in sent else None
    updated = manager.update(table, user, fields=scalar_fields, column_forms=column_forms)
    return ItemResponse(item=manager.to_item(updated, with_columns=True))


@router.post(
    "/{database_table_id}/activate",
    operation_id="api.databases.versions.tables.activate",
    summary="Activate a table",
    description="Set the table status to active. Data roles only.",
    response_model=ItemResponse[DatabaseTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def activate_table(
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseTableItem]:
    updated = manager.set_status(table, DatabaseTableStatus.ACTIVE)
    return ItemResponse(item=manager.to_item(updated, with_columns=True))


@router.post(
    "/{database_table_id}/archive",
    operation_id="api.databases.versions.tables.archive",
    summary="Archive a table",
    description="Set the table status to archived. Data roles only.",
    response_model=ItemResponse[DatabaseTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def archive_table(
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseTableItem]:
    updated = manager.set_status(table, DatabaseTableStatus.ARCHIVED)
    return ItemResponse(item=manager.to_item(updated, with_columns=True))


@router.delete(
    "/{database_table_id}",
    operation_id="api.databases.versions.tables.delete",
    summary="Delete a table",
    description="Soft-delete a table; its columns are soft-deleted as well. Data roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_table(
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> None:
    manager.soft_delete(table)
