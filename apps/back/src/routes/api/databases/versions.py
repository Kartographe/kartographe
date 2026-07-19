# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/databases/{database_id}/versions`.

Versions of a database's schema. Reads are open to any account member; writes
are restricted to the data roles. Activating a version archives the previously
active one. Deleting a version cascades to its tables and columns.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms._bulk import BulkCreateRequest
from src.forms.databases import DatabaseVersionCreateForm, DatabaseVersionPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.databases import DatabaseVersionItem
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentDatabaseDep,
    CurrentDatabaseVersionDep,
    DatabaseVersionManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/databases/{database_id}/versions",
    tags=["api.databases.versions"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Database or version not found"}}

_DATA = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DATA_ANALYST,
)


@router.get(
    "",
    operation_id="api_databases_versions_list",
    summary="List database versions",
    description="List the versions of a database, most recent first. Any member may read.",
    response_model=ListingResponse[DatabaseVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_versions(
    _: CurrentAccountUserDep,
    database: CurrentDatabaseDep,
    manager: DatabaseVersionManagerDep,
) -> ListingResponse[DatabaseVersionItem]:
    items = [DatabaseVersionItem.model_validate(row) for row in manager.list_for_database(database)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_databases_versions_create",
    summary="Create a database version",
    description="Create a version. It starts as a draft. Data roles only.",
    response_model=ItemResponse[DatabaseVersionItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_version(
    form: DatabaseVersionCreateForm,
    database: CurrentDatabaseDep,
    manager: DatabaseVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseVersionItem]:
    version = manager.create(database, version=form.version)
    return ItemResponse(item=DatabaseVersionItem.model_validate(version))


@router.post(
    "/bulk",
    operation_id="api_databases_versions_bulk_create",
    summary="Create several database versions at once",
    description=(
        "Create 1 to 50 database versions in a single call — prefer this over calling "
        "`api_databases_versions_create` in a loop when adding many. Best-effort: each version is "
        "created independently, so one failing item does not roll back the others. Always "
        "returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the "
        "single create. Data roles only."
    ),
    response_model=BulkCreateResponse[DatabaseVersionItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_versions(
    body: BulkCreateRequest[DatabaseVersionCreateForm],
    database: CurrentDatabaseDep,
    manager: DatabaseVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> BulkCreateResponse[DatabaseVersionItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(database, version=form.version),
        serialize=DatabaseVersionItem.model_validate,
    )


@router.get(
    "/{database_version_id}",
    operation_id="api_databases_versions_get",
    summary="Get a database version",
    description="Return a single version of the database. Any member may read.",
    response_model=ItemResponse[DatabaseVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_version(
    _: CurrentAccountUserDep, version: CurrentDatabaseVersionDep
) -> ItemResponse[DatabaseVersionItem]:
    return ItemResponse(item=DatabaseVersionItem.model_validate(version))


@router.patch(
    "/{database_version_id}",
    operation_id="api_databases_versions_update",
    summary="Update a database version",
    description=(
        "Partially update a version (version tuple, status). Data roles only.\n\n"
        "**Setting `status` to `active` also archives the database's previously active "
        "version** and stamps both versions' activity windows, so a database has at most "
        "one active version. Setting it back to `draft` clears the window."
    ),
    response_model=ItemResponse[DatabaseVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_version(
    form: DatabaseVersionPatchForm,
    version: CurrentDatabaseVersionDep,
    manager: DatabaseVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseVersionItem]:
    updated = manager.update(version, form.model_dump(exclude_unset=True))
    return ItemResponse(item=DatabaseVersionItem.model_validate(updated))


@router.delete(
    "/{database_version_id}",
    operation_id="api_databases_versions_delete",
    summary="Delete a database version",
    description=(
        "Soft-delete a version; its tables and columns are soft-deleted as well. Data roles only."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_version(
    version: CurrentDatabaseVersionDep,
    manager: DatabaseVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> None:
    manager.soft_delete(version)
