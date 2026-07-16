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

from src.forms.databases import DatabaseVersionCreateForm, DatabaseVersionPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.databases import DatabaseVersionItem
from src.serializes.errors import ErrorResponse
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
    operation_id="api.databases.versions.list",
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
    operation_id="api.databases.versions.create",
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


@router.get(
    "/{database_version_id}",
    operation_id="api.databases.versions.get",
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
    operation_id="api.databases.versions.update",
    summary="Update a database version",
    description="Partially update a version (version tuple). Data roles only.",
    response_model=ItemResponse[DatabaseVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_version(
    form: DatabaseVersionPatchForm,
    version: CurrentDatabaseVersionDep,
    manager: DatabaseVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseVersionItem]:
    updated = manager.apply_update(version, form.model_dump(exclude_unset=True))
    return ItemResponse(item=DatabaseVersionItem.model_validate(updated))


@router.post(
    "/{database_version_id}/activate",
    operation_id="api.databases.versions.activate",
    summary="Activate a database version",
    description=(
        "Make this the active version. The previously active version is archived and its "
        "`endDate` stamped; this version's `startDate` is stamped. Data roles only."
    ),
    response_model=ItemResponse[DatabaseVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def activate_version(
    version: CurrentDatabaseVersionDep,
    manager: DatabaseVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseVersionItem]:
    updated = manager.activate(version)
    return ItemResponse(item=DatabaseVersionItem.model_validate(updated))


@router.post(
    "/{database_version_id}/archive",
    operation_id="api.databases.versions.archive",
    summary="Archive a database version",
    description="Archive the version, stamping its `endDate`. Data roles only.",
    response_model=ItemResponse[DatabaseVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def archive_version(
    version: CurrentDatabaseVersionDep,
    manager: DatabaseVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseVersionItem]:
    updated = manager.archive(version)
    return ItemResponse(item=DatabaseVersionItem.model_validate(updated))


@router.delete(
    "/{database_version_id}",
    operation_id="api.databases.versions.delete",
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
