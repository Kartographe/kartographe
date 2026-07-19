# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../versions/{database_version_id}/tables/{database_table_id}/columns`.

Columns of a database table. Reads are open to any account member; writes are
restricted to the data roles. A column references a catalogued column type and
may model a foreign key to another table (and optionally one of its columns).
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.filters._base import MyVoteFilter
from src.forms._bulk import BulkCreateRequest
from src.forms.databases import (
    DatabaseTableColumnCreateForm,
    DatabaseTableColumnPatchForm,
    DatabaseTableColumnReorderForm,
)
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.databases import DatabaseTableColumnItem
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentDatabaseTableColumnDep,
    CurrentDatabaseTableDep,
    CurrentUserDep,
    DatabaseTableColumnManagerDep,
    TagManagerDep,
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

_DATA_DEV = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DEVELOPER,
    AccountUserRole.DATA_ANALYST,
)


@router.get(
    "",
    operation_id="api_databases_versions_tables_columns_list",
    summary="List columns",
    description=(
        "List the columns of a table, in insertion order. Any member may read. "
        "Filter with `tagIds` (repeat the query param) to keep only the entities carrying at least one of those tags."
    ),
    response_model=ListingResponse[DatabaseTableColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_columns(
    member: CurrentAccountUserDep,
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableColumnManagerDep,
    tags: TagManagerDep,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
    my_vote: MyVoteFilter = None,
) -> ListingResponse[DatabaseTableColumnItem]:
    rows = manager.list_for_table(table, tag_ids=tag_ids, my_vote=my_vote, user_id=member.user_id)
    items = tags.enrich(EntityType.DATABASE_TABLE_COLUMN, tags.attach(rows, DatabaseTableColumnItem), user_id=member.user_id)
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_databases_versions_tables_columns_create",
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


@router.post(
    "/bulk",
    operation_id="api_databases_versions_tables_columns_bulk_create",
    summary="Create several columns at once",
    description=(
        "Create 1 to 50 columns in a single call — prefer this over calling "
        "`api_databases_versions_tables_columns_create` in a loop when adding many. Best-effort: "
        "each column is created independently, so one failing item does not roll back the others. "
        "Always returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the "
        "single create. Data roles only."
    ),
    response_model=BulkCreateResponse[DatabaseTableColumnItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_columns(
    body: BulkCreateRequest[DatabaseTableColumnCreateForm],
    table: CurrentDatabaseTableDep,
    user: CurrentUserDep,
    manager: DatabaseTableColumnManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> BulkCreateResponse[DatabaseTableColumnItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
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
        ),
        serialize=DatabaseTableColumnItem.model_validate,
    )


@router.post(
    "/reorder",
    operation_id="api_databases_versions_tables_columns_reorder",
    summary="Reorder columns",
    description=(
        "Reorder the columns of a table. Send `columnIds` — every column of the table in its new "
        "order — or `ranks`, mapping a column id to its new position, which may cover only the "
        "columns that move. Returns the table's columns in their new order. Data roles and "
        "developers only."
    ),
    response_model=ListingResponse[DatabaseTableColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def reorder_columns(
    form: DatabaseTableColumnReorderForm,
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableColumnManagerDep,
    _: Annotated[AccountUser, Depends(_DATA_DEV)],
) -> ListingResponse[DatabaseTableColumnItem]:
    rows = manager.reorder(table, column_ids=form.column_ids, ranks=form.ranks)
    items = manager.enrich(
        EntityType.DATABASE_TABLE_COLUMN,
        [DatabaseTableColumnItem.model_validate(row) for row in rows],
    )
    return ListingResponse.single_page(items)


@router.get(
    "/{database_table_column_id}",
    operation_id="api_databases_versions_tables_columns_get",
    summary="Get a column",
    description="Return a single column of the table. Any member may read.",
    response_model=ItemResponse[DatabaseTableColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_column(
    _: CurrentAccountUserDep, column: CurrentDatabaseTableColumnDep, tags: TagManagerDep
) -> ItemResponse[DatabaseTableColumnItem]:
    return ItemResponse(item=tags.enrich_one(EntityType.DATABASE_TABLE_COLUMN, tags.attach_one(column, DatabaseTableColumnItem)))


@router.patch(
    "/{database_table_column_id}",
    operation_id="api_databases_versions_tables_columns_update",
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
    operation_id="api_databases_versions_tables_columns_delete",
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


_LOCK_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


@router.post(
    "/{database_table_column_id}/lock",
    operation_id="api_databases_versions_tables_columns_lock",
    summary="Lock a column",
    description=(
        "Freeze the column against edits and deletion; comments, votes and child "
        "entities stay available. Owners and administrators only."
    ),
    response_model=ItemResponse[DatabaseTableColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def lock_column(
    entity: CurrentDatabaseTableColumnDep,
    user: CurrentUserDep,
    manager: DatabaseTableColumnManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[DatabaseTableColumnItem]:
    return ItemResponse(item=DatabaseTableColumnItem.model_validate(manager.lock(entity, user)))


@router.post(
    "/{database_table_column_id}/unlock",
    operation_id="api_databases_versions_tables_columns_unlock",
    summary="Unlock a column",
    description="Lift the freeze on the column. Owners and administrators only.",
    response_model=ItemResponse[DatabaseTableColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def unlock_column(
    entity: CurrentDatabaseTableColumnDep,
    manager: DatabaseTableColumnManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[DatabaseTableColumnItem]:
    return ItemResponse(item=DatabaseTableColumnItem.model_validate(manager.unlock(entity)))
