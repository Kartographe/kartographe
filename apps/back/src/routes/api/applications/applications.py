# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/applications` — applications tracked in an account.

Reads are open to any account member; writes (create, edit, activate, archive,
delete) are restricted to owners and administrators. Deleting an application
cascades a soft-delete to its environments, versions, deployments and feature
links.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.filters._base import PageLimit, SortOrder
from src.filters.applications import ApplicationSortField
from src.forms.applications import ApplicationCreateForm, ApplicationPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, ApplicationStatus, ApplicationType, EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.applications import ApplicationItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    ApplicationManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentApplicationDep,
    CurrentUserDep,
    TagManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(prefix="/accounts/{account_id}/applications", tags=["api.applications"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account or application not found"}}

_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


@router.get(
    "",
    operation_id="api_applications_list",
    summary="List applications",
    description=(
        "List the applications of the account. Filter by status and/or type (repeat the query "
        "param for multiple values), sort by date/title/status/type, and page through results. "
        "Any member may read. "
        "Filter with `tagIds` (repeat the query param) to keep only the entities carrying at least one of those tags. "
    ),
    response_model=ListingResponse[ApplicationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_applications(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: ApplicationManagerDep,
    tags: TagManagerDep,
    application_status: Annotated[list[ApplicationStatus] | None, Query(alias="status")] = None,
    type: Annotated[list[ApplicationType] | None, Query(alias="type")] = None,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
    sort_by: Annotated[ApplicationSortField, Query(alias="sortBy")] = ApplicationSortField.DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[PageLimit, Query()] = PageLimit.L25,
) -> ListingResponse[ApplicationItem]:
    rows, total = manager.list_for_account(
        account,
        statuses=application_status,
        types=type,
        tag_ids=tag_ids,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit.value,
    )
    items = tags.enrich(EntityType.APPLICATION, tags.attach(rows, ApplicationItem))
    return ListingResponse.paginate(items, count=total, page=page, limit=limit.value)


@router.post(
    "",
    operation_id="api_applications_create",
    summary="Create an application",
    description="Create an application. It starts as a draft owned by the caller. Owners/administrators only.",
    response_model=ItemResponse[ApplicationItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_application(
    form: ApplicationCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    manager: ApplicationManagerDep,
    _: Annotated[AccountUser, Depends(_ADMIN)],
) -> ItemResponse[ApplicationItem]:
    application = manager.create(
        account, user, title=form.title, description=form.description, type=form.type, tag_ids=form.tag_ids
    )
    return ItemResponse(item=ApplicationItem.model_validate(application))


@router.get(
    "/{application_id}",
    operation_id="api_applications_get",
    summary="Get an application",
    description="Return a single application of the account. Any member may read.",
    response_model=ItemResponse[ApplicationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_application(
    _: CurrentAccountUserDep, application: CurrentApplicationDep, tags: TagManagerDep
) -> ItemResponse[ApplicationItem]:
    return ItemResponse(item=tags.enrich_one(EntityType.APPLICATION, tags.attach_one(application, ApplicationItem)))


@router.patch(
    "/{application_id}",
    operation_id="api_applications_update",
    summary="Update an application",
    description="Partially update an application (title, description, type, status). Owners/administrators only.",
    response_model=ItemResponse[ApplicationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_application(
    form: ApplicationPatchForm,
    application: CurrentApplicationDep,
    manager: ApplicationManagerDep,
    _: Annotated[AccountUser, Depends(_ADMIN)],
) -> ItemResponse[ApplicationItem]:
    updated = manager.apply_update(application, form.model_dump(exclude_unset=True))
    return ItemResponse(item=ApplicationItem.model_validate(updated))


@router.delete(
    "/{application_id}",
    operation_id="api_applications_delete",
    summary="Delete an application",
    description=(
        "Soft-delete an application. Its environments, versions, deployments and feature links "
        "are soft-deleted as well. Owners/administrators only."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_application(
    application: CurrentApplicationDep,
    manager: ApplicationManagerDep,
    _: Annotated[AccountUser, Depends(_ADMIN)],
) -> None:
    manager.soft_delete(application)


_LOCK_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


@router.post(
    "/{application_id}/lock",
    operation_id="api_applications_lock",
    summary="Lock an application",
    description=(
        "Freeze the application against edits and deletion; comments, votes and child "
        "entities stay available. Owners and administrators only."
    ),
    response_model=ItemResponse[ApplicationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def lock_application(
    entity: CurrentApplicationDep,
    user: CurrentUserDep,
    manager: ApplicationManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[ApplicationItem]:
    return ItemResponse(item=ApplicationItem.model_validate(manager.lock(entity, user)))


@router.post(
    "/{application_id}/unlock",
    operation_id="api_applications_unlock",
    summary="Unlock an application",
    description="Lift the freeze on the application. Owners and administrators only.",
    response_model=ItemResponse[ApplicationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def unlock_application(
    entity: CurrentApplicationDep,
    manager: ApplicationManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[ApplicationItem]:
    return ItemResponse(item=ApplicationItem.model_validate(manager.unlock(entity)))
