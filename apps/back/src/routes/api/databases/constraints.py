# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../versions/{database_version_id}/tables/{database_table_id}/constraints`.

Constraints declared on a database table. Reads are open to any account member;
writes are restricted to the data roles. A constraint covers columns of its
table; a `foreign_key` constraint also targets a table of the account.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms._bulk import BulkCreateRequest
from src.forms.databases import (
    DatabaseTableConstraintCreateForm,
    DatabaseTableConstraintPatchForm,
)
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.databases import DatabaseTableConstraintItem
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentDatabaseTableConstraintDep,
    CurrentDatabaseTableDep,
    DatabaseTableConstraintManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/constraints",
    tags=["api.databases.versions.tables.constraints"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {
    404: {"model": ErrorResponse, "description": "Table, constraint or referenced table/column not found"}
}

_DATA = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DATA_ANALYST,
)


@router.get(
    "",
    operation_id="api_databases_versions_tables_constraints_list",
    summary="List constraints",
    description=(
        "List the constraints of a table, ordered by rank then insertion. Any member may read."
    ),
    response_model=ListingResponse[DatabaseTableConstraintItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_constraints(
    _: CurrentAccountUserDep,
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableConstraintManagerDep,
) -> ListingResponse[DatabaseTableConstraintItem]:
    rows = manager.list_for_table(table)
    return ListingResponse.single_page(
        [DatabaseTableConstraintItem.model_validate(row) for row in rows]
    )


@router.post(
    "",
    operation_id="api_databases_versions_tables_constraints_create",
    summary="Create a constraint",
    description=(
        "Create a constraint on the table. `columnIds` must reference columns of the table; a "
        "`foreign_key` constraint also needs `foreignKeyDatabaseTableId` and `foreignKeyColumnIds`. "
        "A `check` constraint may be table-level (no columns). Data roles only."
    ),
    response_model=ItemResponse[DatabaseTableConstraintItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_constraint(
    form: DatabaseTableConstraintCreateForm,
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableConstraintManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseTableConstraintItem]:
    constraint = manager.create(
        table,
        name=form.name,
        type=form.type,
        column_ids=form.column_ids,
        check_expression=form.check_expression,
        foreign_key_database_table_id=form.foreign_key_database_table_id,
        foreign_key_column_ids=form.foreign_key_column_ids,
        on_delete=form.on_delete,
        on_update=form.on_update,
        rank=form.rank,
        description=form.description,
    )
    return ItemResponse(item=DatabaseTableConstraintItem.model_validate(constraint))


@router.post(
    "/bulk",
    operation_id="api_databases_versions_tables_constraints_bulk_create",
    summary="Create several constraints at once",
    description=(
        "Create 1 to 50 constraints in a single call — prefer this over calling "
        "`api_databases_versions_tables_constraints_create` in a loop when adding many. "
        "Best-effort: each constraint is created independently, so one failing item does not roll "
        "back the others. Always returns 207; read each `results[].status` (`created`/`error`) and "
        "the `created` / `failed` counts rather than the HTTP code. Each item takes the same shape "
        "as the single create. Data roles only."
    ),
    response_model=BulkCreateResponse[DatabaseTableConstraintItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_constraints(
    body: BulkCreateRequest[DatabaseTableConstraintCreateForm],
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableConstraintManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> BulkCreateResponse[DatabaseTableConstraintItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            table,
            name=form.name,
            type=form.type,
            column_ids=form.column_ids,
            check_expression=form.check_expression,
            foreign_key_database_table_id=form.foreign_key_database_table_id,
            foreign_key_column_ids=form.foreign_key_column_ids,
            on_delete=form.on_delete,
            on_update=form.on_update,
            rank=form.rank,
            description=form.description,
        ),
        serialize=DatabaseTableConstraintItem.model_validate,
    )


@router.get(
    "/{database_table_constraint_id}",
    operation_id="api_databases_versions_tables_constraints_get",
    summary="Get a constraint",
    description="Return a single constraint of the table. Any member may read.",
    response_model=ItemResponse[DatabaseTableConstraintItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_constraint(
    _: CurrentAccountUserDep, constraint: CurrentDatabaseTableConstraintDep
) -> ItemResponse[DatabaseTableConstraintItem]:
    return ItemResponse(item=DatabaseTableConstraintItem.model_validate(constraint))


@router.patch(
    "/{database_table_constraint_id}",
    operation_id="api_databases_versions_tables_constraints_update",
    summary="Update a constraint",
    description=(
        "Partially update a constraint (name, type, columns, check expression, foreign-key target, "
        "referential actions, rank, description). Data roles only."
    ),
    response_model=ItemResponse[DatabaseTableConstraintItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_constraint(
    form: DatabaseTableConstraintPatchForm,
    table: CurrentDatabaseTableDep,
    constraint: CurrentDatabaseTableConstraintDep,
    manager: DatabaseTableConstraintManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseTableConstraintItem]:
    updated = manager.update(table, constraint, form.model_dump(exclude_unset=True))
    return ItemResponse(item=DatabaseTableConstraintItem.model_validate(updated))


@router.delete(
    "/{database_table_constraint_id}",
    operation_id="api_databases_versions_tables_constraints_delete",
    summary="Delete a constraint",
    description="Soft-delete a constraint. Data roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_constraint(
    constraint: CurrentDatabaseTableConstraintDep,
    manager: DatabaseTableConstraintManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> None:
    manager.soft_delete(constraint)
