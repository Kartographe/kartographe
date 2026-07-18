# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../databases/{database_id}/migrations/{database_migration_id}/columns`.

Column-level steps of a migration. Reads are open to any account member;
developers may author steps alongside the data roles, while moving a step through
its statuses stays with the data roles.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.databases import (
    DatabaseMigrationColumnCreateForm,
    DatabaseMigrationColumnPatchForm,
)
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, DatabaseMigrationColumnStatus
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.databases import DatabaseMigrationColumnItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentDatabaseMigrationColumnDep,
    CurrentDatabaseMigrationDep,
    CurrentUserDep,
    DatabaseMigrationColumnManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns",
    tags=["api.databases.migrations.columns"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {
    404: {"model": ErrorResponse, "description": "Migration, step, table or column not found"}
}

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
    operation_id="api_databases_migrations_columns_list",
    summary="List migration columns",
    description="List the column steps of a migration, in insertion order. Any member may read.",
    response_model=ListingResponse[DatabaseMigrationColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_migration_columns(
    _: CurrentAccountUserDep,
    migration: CurrentDatabaseMigrationDep,
    manager: DatabaseMigrationColumnManagerDep,
) -> ListingResponse[DatabaseMigrationColumnItem]:
    items = [
        DatabaseMigrationColumnItem.model_validate(row)
        for row in manager.list_for_migration(migration)
    ]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_databases_migrations_columns_create",
    summary="Create a migration column",
    description=(
        "Add a column step to the migration. Source endpoints must belong to the migration's "
        "source version, destination endpoints to its destination version. It starts as a draft. "
        "Data roles and developers only."
    ),
    response_model=ItemResponse[DatabaseMigrationColumnItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_migration_column(
    form: DatabaseMigrationColumnCreateForm,
    migration: CurrentDatabaseMigrationDep,
    user: CurrentUserDep,
    manager: DatabaseMigrationColumnManagerDep,
    _: Annotated[AccountUser, Depends(_DATA_DEV)],
) -> ItemResponse[DatabaseMigrationColumnItem]:
    column = manager.create(
        migration,
        user,
        type=form.type,
        source_database_table_id=form.source_database_table_id,
        source_database_table_column_id=form.source_database_table_column_id,
        destination_database_table_id=form.destination_database_table_id,
        destination_database_table_column_id=form.destination_database_table_column_id,
        transformation_method=form.transformation_method,
        description=form.description,
    )
    return ItemResponse(item=DatabaseMigrationColumnItem.model_validate(column))


@router.get(
    "/{database_migration_column_id}",
    operation_id="api_databases_migrations_columns_get",
    summary="Get a migration column",
    description="Return a single column step of the migration. Any member may read.",
    response_model=ItemResponse[DatabaseMigrationColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_migration_column(
    _: CurrentAccountUserDep, column: CurrentDatabaseMigrationColumnDep
) -> ItemResponse[DatabaseMigrationColumnItem]:
    return ItemResponse(item=DatabaseMigrationColumnItem.model_validate(column))


@router.patch(
    "/{database_migration_column_id}",
    operation_id="api_databases_migrations_columns_update",
    summary="Update a migration column",
    description=(
        "Partially update a column step (type, source and destination endpoints, transformation "
        "method, description). Data roles and developers only."
    ),
    response_model=ItemResponse[DatabaseMigrationColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_migration_column(
    form: DatabaseMigrationColumnPatchForm,
    migration: CurrentDatabaseMigrationDep,
    column: CurrentDatabaseMigrationColumnDep,
    manager: DatabaseMigrationColumnManagerDep,
    _: Annotated[AccountUser, Depends(_DATA_DEV)],
) -> ItemResponse[DatabaseMigrationColumnItem]:
    updated = manager.update(migration, column, form.model_dump(exclude_unset=True))
    return ItemResponse(item=DatabaseMigrationColumnItem.model_validate(updated))


@router.post(
    "/{database_migration_column_id}/draft",
    operation_id="api_databases_migrations_columns_draft",
    summary="Move a migration column back to draft",
    description="Set the column step status back to draft. Data roles only.",
    response_model=ItemResponse[DatabaseMigrationColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def draft_migration_column(
    column: CurrentDatabaseMigrationColumnDep,
    manager: DatabaseMigrationColumnManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseMigrationColumnItem]:
    updated = manager.set_status(column, DatabaseMigrationColumnStatus.DRAFT)
    return ItemResponse(item=DatabaseMigrationColumnItem.model_validate(updated))


@router.post(
    "/{database_migration_column_id}/to_be_confirmed",
    operation_id="api_databases_migrations_columns_toBeConfirmed",
    summary="Submit a migration column for confirmation",
    description="Set the column step status to awaiting confirmation. Data roles only.",
    response_model=ItemResponse[DatabaseMigrationColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def to_be_confirmed_migration_column(
    column: CurrentDatabaseMigrationColumnDep,
    manager: DatabaseMigrationColumnManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseMigrationColumnItem]:
    updated = manager.set_status(column, DatabaseMigrationColumnStatus.TO_BE_CONFIRMED)
    return ItemResponse(item=DatabaseMigrationColumnItem.model_validate(updated))


@router.post(
    "/{database_migration_column_id}/confirmed",
    operation_id="api_databases_migrations_columns_confirmed",
    summary="Confirm a migration column",
    description="Set the column step status to confirmed. Data roles only.",
    response_model=ItemResponse[DatabaseMigrationColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def confirm_migration_column(
    column: CurrentDatabaseMigrationColumnDep,
    manager: DatabaseMigrationColumnManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseMigrationColumnItem]:
    updated = manager.set_status(column, DatabaseMigrationColumnStatus.CONFIRMED)
    return ItemResponse(item=DatabaseMigrationColumnItem.model_validate(updated))


@router.delete(
    "/{database_migration_column_id}",
    operation_id="api_databases_migrations_columns_delete",
    summary="Delete a migration column",
    description="Soft-delete a column step of the migration. Data roles and developers only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_migration_column(
    column: CurrentDatabaseMigrationColumnDep,
    manager: DatabaseMigrationColumnManagerDep,
    _: Annotated[AccountUser, Depends(_DATA_DEV)],
) -> None:
    manager.soft_delete(column)


_LOCK_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


@router.post(
    "/{database_migration_column_id}/lock",
    operation_id="api_databases_migrations_columns_lock",
    summary="Lock a migration column",
    description=(
        "Freeze the migration column against edits and deletion; comments, votes and child "
        "entities stay available. Owners and administrators only."
    ),
    response_model=ItemResponse[DatabaseMigrationColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def lock_migration_column(
    entity: CurrentDatabaseMigrationColumnDep,
    user: CurrentUserDep,
    manager: DatabaseMigrationColumnManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[DatabaseMigrationColumnItem]:
    return ItemResponse(item=DatabaseMigrationColumnItem.model_validate(manager.lock(entity, user)))


@router.post(
    "/{database_migration_column_id}/unlock",
    operation_id="api_databases_migrations_columns_unlock",
    summary="Unlock a migration column",
    description="Lift the freeze on the migration column. Owners and administrators only.",
    response_model=ItemResponse[DatabaseMigrationColumnItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def unlock_migration_column(
    entity: CurrentDatabaseMigrationColumnDep,
    manager: DatabaseMigrationColumnManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[DatabaseMigrationColumnItem]:
    return ItemResponse(item=DatabaseMigrationColumnItem.model_validate(manager.unlock(entity)))
