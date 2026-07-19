# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../versions/{database_version_id}/tables/{database_table_id}/indexes`.

Indexes declared on a database table. Reads are open to any account member;
writes are restricted to the data roles. An index covers one or more columns of
its table.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms._bulk import BulkCreateRequest
from src.forms.databases import DatabaseTableIndexCreateForm, DatabaseTableIndexPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.databases import DatabaseTableIndexItem
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentDatabaseTableDep,
    CurrentDatabaseTableIndexDep,
    DatabaseTableIndexManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/indexes",
    tags=["api.databases.versions.tables.indexes"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Table, index or referenced column not found"}}

_DATA = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DATA_ANALYST,
)


@router.get(
    "",
    operation_id="api_databases_versions_tables_indexes_list",
    summary="List indexes",
    description="List the indexes of a table, ordered by rank then insertion. Any member may read.",
    response_model=ListingResponse[DatabaseTableIndexItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_indexes(
    _: CurrentAccountUserDep,
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableIndexManagerDep,
) -> ListingResponse[DatabaseTableIndexItem]:
    rows = manager.list_for_table(table)
    return ListingResponse.single_page(
        [DatabaseTableIndexItem.model_validate(row) for row in rows]
    )


@router.post(
    "",
    operation_id="api_databases_versions_tables_indexes_create",
    summary="Create an index",
    description=(
        "Create an index on the table. `columnIds` (ordered) must reference columns of the table. "
        "Data roles only."
    ),
    response_model=ItemResponse[DatabaseTableIndexItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_index(
    form: DatabaseTableIndexCreateForm,
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableIndexManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseTableIndexItem]:
    index = manager.create(
        table,
        name=form.name,
        type=form.type,
        unique=form.unique,
        column_ids=form.column_ids,
        where_clause=form.where_clause,
        rank=form.rank,
        description=form.description,
    )
    return ItemResponse(item=DatabaseTableIndexItem.model_validate(index))


@router.post(
    "/bulk",
    operation_id="api_databases_versions_tables_indexes_bulk_create",
    summary="Create several indexes at once",
    description=(
        "Create 1 to 50 indexes in a single call — prefer this over calling "
        "`api_databases_versions_tables_indexes_create` in a loop when adding many. Best-effort: "
        "each index is created independently, so one failing item does not roll back the others. "
        "Always returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the single "
        "create. Data roles only."
    ),
    response_model=BulkCreateResponse[DatabaseTableIndexItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_indexes(
    body: BulkCreateRequest[DatabaseTableIndexCreateForm],
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableIndexManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> BulkCreateResponse[DatabaseTableIndexItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            table,
            name=form.name,
            type=form.type,
            unique=form.unique,
            column_ids=form.column_ids,
            where_clause=form.where_clause,
            rank=form.rank,
            description=form.description,
        ),
        serialize=DatabaseTableIndexItem.model_validate,
    )


@router.get(
    "/{database_table_index_id}",
    operation_id="api_databases_versions_tables_indexes_get",
    summary="Get an index",
    description="Return a single index of the table. Any member may read.",
    response_model=ItemResponse[DatabaseTableIndexItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_index(
    _: CurrentAccountUserDep, index: CurrentDatabaseTableIndexDep
) -> ItemResponse[DatabaseTableIndexItem]:
    return ItemResponse(item=DatabaseTableIndexItem.model_validate(index))


@router.patch(
    "/{database_table_index_id}",
    operation_id="api_databases_versions_tables_indexes_update",
    summary="Update an index",
    description=(
        "Partially update an index (name, type, unique, columns, where clause, rank, description). "
        "Data roles only."
    ),
    response_model=ItemResponse[DatabaseTableIndexItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_index(
    form: DatabaseTableIndexPatchForm,
    table: CurrentDatabaseTableDep,
    index: CurrentDatabaseTableIndexDep,
    manager: DatabaseTableIndexManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseTableIndexItem]:
    updated = manager.update(table, index, form.model_dump(exclude_unset=True))
    return ItemResponse(item=DatabaseTableIndexItem.model_validate(updated))


@router.delete(
    "/{database_table_index_id}",
    operation_id="api_databases_versions_tables_indexes_delete",
    summary="Delete an index",
    description="Soft-delete an index. Data roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_index(
    index: CurrentDatabaseTableIndexDep,
    manager: DatabaseTableIndexManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> None:
    manager.soft_delete(index)
