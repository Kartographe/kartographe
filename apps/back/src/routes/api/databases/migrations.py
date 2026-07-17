# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/databases/{database_id}/migrations`.

Migrations leaving a database, towards a version of any database of the account.
Reads are open to any account member; writes are restricted to the data roles.
Deleting a migration cascades to its column steps.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.databases import DatabaseMigrationCreateForm, DatabaseMigrationPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, DatabaseMigrationStatus
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.databases import DatabaseMigrationItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentDatabaseDep,
    CurrentDatabaseMigrationDep,
    DatabaseMigrationManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/databases/{database_id}/migrations",
    tags=["api.databases.migrations"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Database, version or migration not found"}}

_DATA = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DATA_ANALYST,
)


@router.get(
    "",
    operation_id="api_databases_migrations_list",
    summary="List database migrations",
    description=(
        "List the migrations leaving this database, most recent first. Any member may read."
    ),
    response_model=ListingResponse[DatabaseMigrationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_migrations(
    _: CurrentAccountUserDep,
    database: CurrentDatabaseDep,
    manager: DatabaseMigrationManagerDep,
) -> ListingResponse[DatabaseMigrationItem]:
    items = [DatabaseMigrationItem.model_validate(row) for row in manager.list_for_database(database)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_databases_migrations_create",
    summary="Create a database migration",
    description=(
        "Plan a migration leaving a version of this database towards a version of any database "
        "of the account. It starts as a draft. Data roles only."
    ),
    response_model=ItemResponse[DatabaseMigrationItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_migration(
    form: DatabaseMigrationCreateForm,
    database: CurrentDatabaseDep,
    manager: DatabaseMigrationManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseMigrationItem]:
    migration = manager.create(
        database,
        type=form.type,
        title=form.title,
        description=form.description,
        source_database_version_id=form.source_database_version_id,
        destination_database_id=form.destination_database_id,
        destination_database_version_id=form.destination_database_version_id,
    )
    return ItemResponse(item=DatabaseMigrationItem.model_validate(migration))


@router.get(
    "/{database_migration_id}",
    operation_id="api_databases_migrations_get",
    summary="Get a database migration",
    description="Return a single migration of the database. Any member may read.",
    response_model=ItemResponse[DatabaseMigrationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_migration(
    _: CurrentAccountUserDep, migration: CurrentDatabaseMigrationDep
) -> ItemResponse[DatabaseMigrationItem]:
    return ItemResponse(item=DatabaseMigrationItem.model_validate(migration))


@router.patch(
    "/{database_migration_id}",
    operation_id="api_databases_migrations_update",
    summary="Update a database migration",
    description=(
        "Partially update a migration (type, title, description, source version, destination "
        "database and version). Data roles only."
    ),
    response_model=ItemResponse[DatabaseMigrationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_migration(
    form: DatabaseMigrationPatchForm,
    database: CurrentDatabaseDep,
    migration: CurrentDatabaseMigrationDep,
    manager: DatabaseMigrationManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseMigrationItem]:
    updated = manager.update(database, migration, form.model_dump(exclude_unset=True))
    return ItemResponse(item=DatabaseMigrationItem.model_validate(updated))


@router.post(
    "/{database_migration_id}/draft",
    operation_id="api_databases_migrations_draft",
    summary="Move a migration back to draft",
    description="Set the migration status back to draft. Data roles only.",
    response_model=ItemResponse[DatabaseMigrationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def draft_migration(
    migration: CurrentDatabaseMigrationDep,
    manager: DatabaseMigrationManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseMigrationItem]:
    updated = manager.set_status(migration, DatabaseMigrationStatus.DRAFT)
    return ItemResponse(item=DatabaseMigrationItem.model_validate(updated))


@router.post(
    "/{database_migration_id}/validated",
    operation_id="api_databases_migrations_validated",
    summary="Validate a migration",
    description="Set the migration status to validated. Data roles only.",
    response_model=ItemResponse[DatabaseMigrationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def validate_migration(
    migration: CurrentDatabaseMigrationDep,
    manager: DatabaseMigrationManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseMigrationItem]:
    updated = manager.set_status(migration, DatabaseMigrationStatus.VALIDATED)
    return ItemResponse(item=DatabaseMigrationItem.model_validate(updated))


@router.post(
    "/{database_migration_id}/completed",
    operation_id="api_databases_migrations_completed",
    summary="Complete a migration",
    description="Set the migration status to completed. Data roles only.",
    response_model=ItemResponse[DatabaseMigrationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def complete_migration(
    migration: CurrentDatabaseMigrationDep,
    manager: DatabaseMigrationManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseMigrationItem]:
    updated = manager.set_status(migration, DatabaseMigrationStatus.COMPLETED)
    return ItemResponse(item=DatabaseMigrationItem.model_validate(updated))


@router.post(
    "/{database_migration_id}/cancelled",
    operation_id="api_databases_migrations_cancelled",
    summary="Cancel a migration",
    description="Set the migration status to cancelled. Data roles only.",
    response_model=ItemResponse[DatabaseMigrationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def cancel_migration(
    migration: CurrentDatabaseMigrationDep,
    manager: DatabaseMigrationManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseMigrationItem]:
    updated = manager.set_status(migration, DatabaseMigrationStatus.CANCELLED)
    return ItemResponse(item=DatabaseMigrationItem.model_validate(updated))


@router.delete(
    "/{database_migration_id}",
    operation_id="api_databases_migrations_delete",
    summary="Delete a database migration",
    description="Soft-delete a migration; its column steps are soft-deleted as well. Data roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_migration(
    migration: CurrentDatabaseMigrationDep,
    manager: DatabaseMigrationManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> None:
    manager.soft_delete(migration)
