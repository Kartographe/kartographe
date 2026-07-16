# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../applications/{application_id}/environments/{environment_id}/versions`.

Deployment records: a version deployed onto an environment, driven through its
state (standby → finished / error / cancelled). Reads are open to any account
member; writes are restricted to owners, administrators and lead developers.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.applications import (
    ApplicationEnvironmentVersionCreateForm,
    ApplicationEnvironmentVersionErrorForm,
    ApplicationEnvironmentVersionPatchForm,
)
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, ApplicationEnvironmentVersionStatus
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.applications import ApplicationEnvironmentVersionItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    ApplicationEnvironmentVersionManagerDep,
    CurrentAccountUserDep,
    CurrentApplicationDep,
    CurrentApplicationEnvironmentDep,
    CurrentApplicationEnvironmentVersionDep,
    CurrentUserDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/environments/{environment_id}/versions",
    tags=["api.applications.environmentVersions"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Environment, version or deployment not found"}}

_DEV_LEAD = require_role(
    AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR, AccountUserRole.LEAD_DEVELOPER
)


@router.get(
    "",
    operation_id="api.applications.environmentVersions.list",
    summary="List deployments",
    description="List the deployment records of an environment, most recent first. Any member may read.",
    response_model=ListingResponse[ApplicationEnvironmentVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_deployments(
    _: CurrentAccountUserDep,
    environment: CurrentApplicationEnvironmentDep,
    manager: ApplicationEnvironmentVersionManagerDep,
) -> ListingResponse[ApplicationEnvironmentVersionItem]:
    items = [
        ApplicationEnvironmentVersionItem.model_validate(row)
        for row in manager.list_for_environment(environment)
    ]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api.applications.environmentVersions.create",
    summary="Deploy a version",
    description=(
        "Record a deployment of a version onto the environment. It starts in the standby state, "
        "owned by the caller. Owners, administrators and lead developers only."
    ),
    response_model=ItemResponse[ApplicationEnvironmentVersionItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_deployment(
    form: ApplicationEnvironmentVersionCreateForm,
    application: CurrentApplicationDep,
    environment: CurrentApplicationEnvironmentDep,
    user: CurrentUserDep,
    manager: ApplicationEnvironmentVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> ItemResponse[ApplicationEnvironmentVersionItem]:
    application_version = manager.resolve_application_version(application, form.application_version_id)
    deployment = manager.create(environment, application_version, user)
    return ItemResponse(item=ApplicationEnvironmentVersionItem.model_validate(deployment))


@router.get(
    "/{environment_version_id}",
    operation_id="api.applications.environmentVersions.get",
    summary="Get a deployment",
    description="Return a single deployment record of the environment. Any member may read.",
    response_model=ItemResponse[ApplicationEnvironmentVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_deployment(
    _: CurrentAccountUserDep, deployment: CurrentApplicationEnvironmentVersionDep
) -> ItemResponse[ApplicationEnvironmentVersionItem]:
    return ItemResponse(item=ApplicationEnvironmentVersionItem.model_validate(deployment))


@router.patch(
    "/{environment_version_id}",
    operation_id="api.applications.environmentVersions.update",
    summary="Update a deployment",
    description=(
        "Update a deployment's state and/or its details. "
        "Owners, administrators and lead developers only."
    ),
    response_model=ItemResponse[ApplicationEnvironmentVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_deployment(
    form: ApplicationEnvironmentVersionPatchForm,
    deployment: CurrentApplicationEnvironmentVersionDep,
    manager: ApplicationEnvironmentVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> ItemResponse[ApplicationEnvironmentVersionItem]:
    fields = form.model_dump(exclude_unset=True)
    new_status = fields.get("status", deployment.status)
    updated = manager.set_status(deployment, new_status, status_details=fields.get("status_details"))
    return ItemResponse(item=ApplicationEnvironmentVersionItem.model_validate(updated))


@router.post(
    "/{environment_version_id}/finished",
    operation_id="api.applications.environmentVersions.finished",
    summary="Mark a deployment finished",
    description="Mark the deployment as finished. Owners, administrators and lead developers only.",
    response_model=ItemResponse[ApplicationEnvironmentVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def finish_deployment(
    deployment: CurrentApplicationEnvironmentVersionDep,
    manager: ApplicationEnvironmentVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> ItemResponse[ApplicationEnvironmentVersionItem]:
    updated = manager.set_status(deployment, ApplicationEnvironmentVersionStatus.FINISHED)
    return ItemResponse(item=ApplicationEnvironmentVersionItem.model_validate(updated))


@router.post(
    "/{environment_version_id}/error",
    operation_id="api.applications.environmentVersions.error",
    summary="Mark a deployment failed",
    description=(
        "Mark the deployment as failed, with a required explanation. "
        "Owners, administrators and lead developers only."
    ),
    response_model=ItemResponse[ApplicationEnvironmentVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def error_deployment(
    form: ApplicationEnvironmentVersionErrorForm,
    deployment: CurrentApplicationEnvironmentVersionDep,
    manager: ApplicationEnvironmentVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> ItemResponse[ApplicationEnvironmentVersionItem]:
    updated = manager.set_status(
        deployment, ApplicationEnvironmentVersionStatus.ERROR, status_details=form.status_details
    )
    return ItemResponse(item=ApplicationEnvironmentVersionItem.model_validate(updated))


@router.post(
    "/{environment_version_id}/cancelled",
    operation_id="api.applications.environmentVersions.cancelled",
    summary="Cancel a deployment",
    description="Mark the deployment as cancelled. Owners, administrators and lead developers only.",
    response_model=ItemResponse[ApplicationEnvironmentVersionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def cancel_deployment(
    deployment: CurrentApplicationEnvironmentVersionDep,
    manager: ApplicationEnvironmentVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> ItemResponse[ApplicationEnvironmentVersionItem]:
    updated = manager.set_status(deployment, ApplicationEnvironmentVersionStatus.CANCELLED)
    return ItemResponse(item=ApplicationEnvironmentVersionItem.model_validate(updated))


@router.delete(
    "/{environment_version_id}",
    operation_id="api.applications.environmentVersions.delete",
    summary="Delete a deployment",
    description="Soft-delete a single deployment record. Owners, administrators and lead developers only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_deployment(
    deployment: CurrentApplicationEnvironmentVersionDep,
    manager: ApplicationEnvironmentVersionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> None:
    manager.soft_delete(deployment)
