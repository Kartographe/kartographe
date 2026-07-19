# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/applications/{application_id}/environments`.

Deployment environments of an application. Reads are open to any account
member; writes are restricted to owners, administrators and lead developers.
Deleting an environment cascades a soft-delete to its deployment records.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms._bulk import BulkCreateRequest
from src.forms.applications import (
    ApplicationEnvironmentCreateForm,
    ApplicationEnvironmentPatchForm,
)
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.applications import ApplicationEnvironmentItem
from src.serializes.bulk import BulkCreateResponse
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    ApplicationEnvironmentManagerDep,
    CurrentAccountUserDep,
    CurrentApplicationDep,
    CurrentApplicationEnvironmentDep,
    CurrentUserDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/environments",
    tags=["api.applications.environments"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Application or environment not found"}}

_DEV_LEAD = require_role(
    AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR, AccountUserRole.LEAD_DEVELOPER
)


@router.get(
    "",
    operation_id="api_applications_environments_list",
    summary="List environments",
    description="List the environments of an application, most recent first. Any member may read.",
    response_model=ListingResponse[ApplicationEnvironmentItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_environments(
    _: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: ApplicationEnvironmentManagerDep,
) -> ListingResponse[ApplicationEnvironmentItem]:
    items = [ApplicationEnvironmentItem.model_validate(row) for row in manager.list_for_application(application)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_applications_environments_create",
    summary="Create an environment",
    description=(
        "Create a deployment environment. It starts as a draft owned by the caller. "
        "Owners, administrators and lead developers only."
    ),
    response_model=ItemResponse[ApplicationEnvironmentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_environment(
    form: ApplicationEnvironmentCreateForm,
    application: CurrentApplicationDep,
    user: CurrentUserDep,
    manager: ApplicationEnvironmentManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> ItemResponse[ApplicationEnvironmentItem]:
    environment = manager.create(
        application,
        user,
        type=form.type,
        title=form.title,
        description=form.description,
        url=form.url,
        openapi_url=form.openapi_url,
    )
    return ItemResponse(item=ApplicationEnvironmentItem.model_validate(environment))


@router.post(
    "/bulk",
    operation_id="api_applications_environments_bulk_create",
    summary="Create several environments at once",
    description=(
        "Create 1 to 50 deployment environments in a single call — prefer this over calling "
        "`api_applications_environments_create` in a loop when adding many. Best-effort: each "
        "environment is created independently, so one failing item does not roll back the others. "
        "Always returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the "
        "single create. Owners, administrators and lead developers only."
    ),
    response_model=BulkCreateResponse[ApplicationEnvironmentItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_environments(
    body: BulkCreateRequest[ApplicationEnvironmentCreateForm],
    application: CurrentApplicationDep,
    user: CurrentUserDep,
    manager: ApplicationEnvironmentManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> BulkCreateResponse[ApplicationEnvironmentItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            application,
            user,
            type=form.type,
            title=form.title,
            description=form.description,
            url=form.url,
            openapi_url=form.openapi_url,
        ),
        serialize=ApplicationEnvironmentItem.model_validate,
    )


@router.get(
    "/{environment_id}",
    operation_id="api_applications_environments_get",
    summary="Get an environment",
    description="Return a single environment of the application. Any member may read.",
    response_model=ItemResponse[ApplicationEnvironmentItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_environment(
    _: CurrentAccountUserDep, environment: CurrentApplicationEnvironmentDep
) -> ItemResponse[ApplicationEnvironmentItem]:
    return ItemResponse(item=ApplicationEnvironmentItem.model_validate(environment))


@router.patch(
    "/{environment_id}",
    operation_id="api_applications_environments_update",
    summary="Update an environment",
    description=(
        "Partially update an environment (type, title, description, url, status). "
        "Owners, administrators and lead developers only."
    ),
    response_model=ItemResponse[ApplicationEnvironmentItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_environment(
    form: ApplicationEnvironmentPatchForm,
    environment: CurrentApplicationEnvironmentDep,
    manager: ApplicationEnvironmentManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> ItemResponse[ApplicationEnvironmentItem]:
    updated = manager.apply_update(environment, form.model_dump(exclude_unset=True))
    return ItemResponse(item=ApplicationEnvironmentItem.model_validate(updated))


@router.delete(
    "/{environment_id}",
    operation_id="api_applications_environments_delete",
    summary="Delete an environment",
    description=(
        "Soft-delete an environment; its deployment records are soft-deleted as well. "
        "Owners, administrators and lead developers only."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_environment(
    environment: CurrentApplicationEnvironmentDep,
    manager: ApplicationEnvironmentManagerDep,
    _: Annotated[AccountUser, Depends(_DEV_LEAD)],
) -> None:
    manager.soft_delete(environment)
