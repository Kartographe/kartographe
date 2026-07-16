# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/applications/{application_id}/versions`.

Released versions of an application. Reads are open to any account member;
writes are restricted to owners, administrators and lead developers. Deleting a
version cascades a soft-delete to the deployment records that reference it.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.applications import ApplicationVersionCreateForm, ApplicationVersionPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, ApplicationStatus
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.applications import ApplicationVersionItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    ApplicationVersionManagerDep,
    CurrentAccountUserDep,
    CurrentApplicationDep,
    CurrentApplicationVersionDep,
    CurrentUserDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/versions",
    tags=["api.applications.versions"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Application or version not found"}}

_DEV_LEAD = require_role(
    AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR, AccountUserRole.LEAD_DEVELOPER
)


@router.get(
    "",
    operation_id="api.applications.versions.list",
    summary="List versions",
    description="List the versions of an application, most recent first. Any member may read.",
    response_model=ListingResponse[ApplicationVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_versions(
    _: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: ApplicationVersionManagerDep,
) -> ListingResponse[ApplicationVersionItem]:
    items = [ApplicationVersionItem.model_validate(row) for row in manager.list_for_application(application)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api.applications.versions.create",
    summary="Create a version",
    description=(
        "Create a version. It starts as a draft owned by the caller. "
        "Owners, administrators and lead developers only."
    ),
    response_model=ItemResponse[ApplicationVersionItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_version(
    form: ApplicationVersionCreateForm,
    application: CurrentApplicationDep,
    user: CurrentUserDep,
    manager: ApplicationVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> ItemResponse[ApplicationVersionItem]:
    version = manager.create(
        application,
        user,
        type=form.type,
        title=form.title,
        version=form.version,
        description=form.description,
    )
    return ItemResponse(item=ApplicationVersionItem.model_validate(version))


@router.get(
    "/{version_id}",
    operation_id="api.applications.versions.get",
    summary="Get a version",
    description="Return a single version of the application. Any member may read.",
    response_model=ItemResponse[ApplicationVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_version(
    _: CurrentAccountUserDep, version: CurrentApplicationVersionDep
) -> ItemResponse[ApplicationVersionItem]:
    return ItemResponse(item=ApplicationVersionItem.model_validate(version))


@router.patch(
    "/{version_id}",
    operation_id="api.applications.versions.update",
    summary="Update a version",
    description=(
        "Partially update a version (type, title, version, description). "
        "Owners, administrators and lead developers only."
    ),
    response_model=ItemResponse[ApplicationVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_version(
    form: ApplicationVersionPatchForm,
    version: CurrentApplicationVersionDep,
    manager: ApplicationVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> ItemResponse[ApplicationVersionItem]:
    updated = manager.apply_update(version, form.model_dump(exclude_unset=True))
    return ItemResponse(item=ApplicationVersionItem.model_validate(updated))


@router.post(
    "/{version_id}/activate",
    operation_id="api.applications.versions.activate",
    summary="Activate a version",
    description="Set the version status to active. Owners, administrators and lead developers only.",
    response_model=ItemResponse[ApplicationVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def activate_version(
    version: CurrentApplicationVersionDep,
    manager: ApplicationVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> ItemResponse[ApplicationVersionItem]:
    updated = manager.set_status(version, ApplicationStatus.ACTIVE)
    return ItemResponse(item=ApplicationVersionItem.model_validate(updated))


@router.post(
    "/{version_id}/archive",
    operation_id="api.applications.versions.archive",
    summary="Archive a version",
    description="Set the version status to archived. Owners, administrators and lead developers only.",
    response_model=ItemResponse[ApplicationVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def archive_version(
    version: CurrentApplicationVersionDep,
    manager: ApplicationVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> ItemResponse[ApplicationVersionItem]:
    updated = manager.set_status(version, ApplicationStatus.ARCHIVED)
    return ItemResponse(item=ApplicationVersionItem.model_validate(updated))


@router.delete(
    "/{version_id}",
    operation_id="api.applications.versions.delete",
    summary="Delete a version",
    description=(
        "Soft-delete a version; deployment records referencing it are soft-deleted as well. "
        "Owners, administrators and lead developers only."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_version(
    version: CurrentApplicationVersionDep,
    manager: ApplicationVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> None:
    manager.soft_delete(version)
