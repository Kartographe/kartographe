# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../tables/{database_table_id}/columns/{database_table_column_id}/subfields`.

Sub-fields of a JSON column. Reads are open to any account member; writes are
restricted to the data roles. A sub-field references a catalogued column type and
may nest under another sub-field of the same column (`parentSubfieldId`).

Sub-fields can also be managed inline with their column (sent as the column's
`subfields` tree on a column create/update); these routes edit them one at a time.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms._bulk import BulkCreateRequest
from src.forms.databases import (
    DatabaseTableColumnSubfieldCreateForm,
    DatabaseTableColumnSubfieldPatchForm,
)
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.databases import DatabaseTableColumnSubfieldItem
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentDatabaseTableColumnDep,
    CurrentDatabaseTableColumnSubfieldDep,
    DatabaseTableColumnSubfieldManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/subfields",
    tags=["api.databases.versions.tables.columns.subfields"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {
    404: {"model": ErrorResponse, "description": "Column, sub-field, column type or parent not found"}
}

_DATA = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DATA_ANALYST,
)


@router.get(
    "",
    operation_id="api_databases_versions_tables_columns_subfields_list",
    summary="List sub-fields",
    description=(
        "List the JSON sub-fields of a column, ordered by rank then insertion. Nesting is read "
        "from each item's `parentSubfieldId`. Any member may read."
    ),
    response_model=ListingResponse[DatabaseTableColumnSubfieldItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_subfields(
    _: CurrentAccountUserDep,
    column: CurrentDatabaseTableColumnDep,
    manager: DatabaseTableColumnSubfieldManagerDep,
) -> ListingResponse[DatabaseTableColumnSubfieldItem]:
    rows = manager.list_for_column(column)
    return ListingResponse.single_page(
        [DatabaseTableColumnSubfieldItem.model_validate(row) for row in rows]
    )


@router.post(
    "",
    operation_id="api_databases_versions_tables_columns_subfields_create",
    summary="Create a sub-field",
    description=(
        "Create a JSON sub-field on the column. It references a catalogued column type and may "
        "nest under an existing sub-field of the same column via `parentSubfieldId`. Data roles only."
    ),
    response_model=ItemResponse[DatabaseTableColumnSubfieldItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_subfield(
    form: DatabaseTableColumnSubfieldCreateForm,
    column: CurrentDatabaseTableColumnDep,
    manager: DatabaseTableColumnSubfieldManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseTableColumnSubfieldItem]:
    subfield = manager.create(
        column,
        database_column_type_id=form.database_column_type_id,
        parent_subfield_id=form.parent_subfield_id,
        name=form.name,
        nullable=form.nullable,
        rank=form.rank,
        description=form.description,
    )
    return ItemResponse(item=DatabaseTableColumnSubfieldItem.model_validate(subfield))


@router.post(
    "/bulk",
    operation_id="api_databases_versions_tables_columns_subfields_bulk_create",
    summary="Create several sub-fields at once",
    description=(
        "Create 1 to 50 sub-fields in a single call — prefer this over calling "
        "`api_databases_versions_tables_columns_subfields_create` in a loop when adding many. "
        "Best-effort: each sub-field is created independently, so one failing item does not roll "
        "back the others. Always returns 207; read each `results[].status` (`created`/`error`) and "
        "the `created` / `failed` counts rather than the HTTP code. To nest, create a parent first, "
        "then reference its id in a later call. Data roles only."
    ),
    response_model=BulkCreateResponse[DatabaseTableColumnSubfieldItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_subfields(
    body: BulkCreateRequest[DatabaseTableColumnSubfieldCreateForm],
    column: CurrentDatabaseTableColumnDep,
    manager: DatabaseTableColumnSubfieldManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> BulkCreateResponse[DatabaseTableColumnSubfieldItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            column,
            database_column_type_id=form.database_column_type_id,
            parent_subfield_id=form.parent_subfield_id,
            name=form.name,
            nullable=form.nullable,
            rank=form.rank,
            description=form.description,
        ),
        serialize=DatabaseTableColumnSubfieldItem.model_validate,
    )


@router.get(
    "/{database_table_column_subfield_id}",
    operation_id="api_databases_versions_tables_columns_subfields_get",
    summary="Get a sub-field",
    description="Return a single sub-field of the column. Any member may read.",
    response_model=ItemResponse[DatabaseTableColumnSubfieldItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_subfield(
    _: CurrentAccountUserDep, subfield: CurrentDatabaseTableColumnSubfieldDep
) -> ItemResponse[DatabaseTableColumnSubfieldItem]:
    return ItemResponse(item=DatabaseTableColumnSubfieldItem.model_validate(subfield))


@router.patch(
    "/{database_table_column_subfield_id}",
    operation_id="api_databases_versions_tables_columns_subfields_update",
    summary="Update a sub-field",
    description=(
        "Partially update a sub-field (type, parent, name, nullable, rank, description). "
        "Send `parentSubfieldId: null` to move it back to the top level. Data roles only."
    ),
    response_model=ItemResponse[DatabaseTableColumnSubfieldItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_subfield(
    form: DatabaseTableColumnSubfieldPatchForm,
    column: CurrentDatabaseTableColumnDep,
    subfield: CurrentDatabaseTableColumnSubfieldDep,
    manager: DatabaseTableColumnSubfieldManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseTableColumnSubfieldItem]:
    updated = manager.update(column, subfield, form.model_dump(exclude_unset=True))
    return ItemResponse(item=DatabaseTableColumnSubfieldItem.model_validate(updated))


@router.delete(
    "/{database_table_column_subfield_id}",
    operation_id="api_databases_versions_tables_columns_subfields_delete",
    summary="Delete a sub-field",
    description="Soft-delete a sub-field and every sub-field nested under it. Data roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_subfield(
    subfield: CurrentDatabaseTableColumnSubfieldDep,
    manager: DatabaseTableColumnSubfieldManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> None:
    manager.soft_delete(subfield)
