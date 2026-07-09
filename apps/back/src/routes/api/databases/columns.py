"""`.../versions/{database_version_id}/tables/{database_table_id}/columns`.

Columns of a database table. Reads are open to any account member; writes are
restricted to the data roles. A column references a catalogued column type and
may model a foreign key to another table (and optionally one of its columns).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.databases import DatabaseTableColumnCreateForm, DatabaseTableColumnPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.databases import DatabaseTableColumnItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentDatabaseTableColumnDep,
    CurrentDatabaseTableDep,
    CurrentUserDep,
    DatabaseTableColumnManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns",
    tags=["api.databases.versions.tables.columns"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Table, column, column type or reference not found"}}

_DATA = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DATA_ANALYST,
)


@router.get(
    "",
    operation_id="api.databases.versions.tables.columns.list",
    summary="List columns",
    description="List the columns of a table, in insertion order. Any member may read.",
    response_model=ListingResponse[DatabaseTableColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_columns(
    _: CurrentAccountUserDep,
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableColumnManagerDep,
) -> ListingResponse[DatabaseTableColumnItem]:
    items = [DatabaseTableColumnItem.model_validate(row) for row in manager.list_for_table(table)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api.databases.versions.tables.columns.create",
    summary="Create a column",
    description=(
        "Create a column on the table. It references a catalogued column type and may model a "
        "foreign key to another table of the account. Data roles only."
    ),
    response_model=ItemResponse[DatabaseTableColumnItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_column(
    form: DatabaseTableColumnCreateForm,
    table: CurrentDatabaseTableDep,
    user: CurrentUserDep,
    manager: DatabaseTableColumnManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseTableColumnItem]:
    column = manager.create(
        table,
        user,
        database_column_type_id=form.database_column_type_id,
        foreign_key_database_table_id=form.foreign_key_database_table_id,
        foreign_key_database_table_column_id=form.foreign_key_database_table_column_id,
        nullable=form.nullable,
        unique=form.unique,
        system_field=form.system_field,
        rank=form.rank,
        default_value=form.default_value,
        name=form.name,
        description=form.description,
        color=form.color,
        tag_ids=form.tag_ids,
    )
    return ItemResponse(item=DatabaseTableColumnItem.model_validate(column))


@router.get(
    "/{database_table_column_id}",
    operation_id="api.databases.versions.tables.columns.get",
    summary="Get a column",
    description="Return a single column of the table. Any member may read.",
    response_model=ItemResponse[DatabaseTableColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_column(
    _: CurrentAccountUserDep, column: CurrentDatabaseTableColumnDep
) -> ItemResponse[DatabaseTableColumnItem]:
    return ItemResponse(item=DatabaseTableColumnItem.model_validate(column))


@router.patch(
    "/{database_table_column_id}",
    operation_id="api.databases.versions.tables.columns.update",
    summary="Update a column",
    description=(
        "Partially update a column (type, foreign key, nullable, unique, default, name, "
        "description, color, tags). Data roles only."
    ),
    response_model=ItemResponse[DatabaseTableColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_column(
    form: DatabaseTableColumnPatchForm,
    table: CurrentDatabaseTableDep,
    column: CurrentDatabaseTableColumnDep,
    manager: DatabaseTableColumnManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseTableColumnItem]:
    updated = manager.update(table, column, form.model_dump(exclude_unset=True))
    return ItemResponse(item=DatabaseTableColumnItem.model_validate(updated))


@router.delete(
    "/{database_table_column_id}",
    operation_id="api.databases.versions.tables.columns.delete",
    summary="Delete a column",
    description="Soft-delete a column. Data roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_column(
    column: CurrentDatabaseTableColumnDep,
    manager: DatabaseTableColumnManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> None:
    manager.soft_delete(column)
