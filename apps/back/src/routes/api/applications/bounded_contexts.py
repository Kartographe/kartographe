# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/applications/{application_id}/bounded-contexts`.

Bounded contexts of an application: named areas of the domain, each holding the
components that belong to it. Reads are open to any account member; writes are
restricted to the dev roles, and locking to the owners/administrators. The
referenced components must belong to the same application.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.filters._base import MyComplexityFilter, MyVoteFilter
from src.forms._bulk import BulkCreateRequest
from src.forms.application_bounded_contexts import (
    ApplicationBoundedContextCreateForm,
    ApplicationBoundedContextPatchForm,
)
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.application_bounded_contexts import ApplicationBoundedContextItem
from src.serializes.bulk import BulkCreateResponse
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    ApplicationBoundedContextManagerDep,
    CurrentAccountUserDep,
    CurrentApplicationBoundedContextDep,
    CurrentApplicationDep,
    CurrentUserDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/bounded-contexts",
    tags=["api.applications.boundedContexts"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {
    404: {"model": ErrorResponse, "description": "Application, bounded context or component not found"}
}
_LOCKED = {409: {"model": ErrorResponse, "description": "Bounded context is locked"}}

_DEV = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DEVELOPER,
)


@router.get(
    "",
    operation_id="api_applications_boundedContexts_list",
    summary="List bounded contexts",
    description=(
        "List the bounded contexts of an application, most recent first. Filter with "
        "`componentIds` (repeat the query param) to keep only the contexts holding at least one "
        "of those components. Any member may read."
    ),
    response_model=ListingResponse[ApplicationBoundedContextItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_bounded_contexts(
    member: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: ApplicationBoundedContextManagerDep,
    component_ids: Annotated[list[uuid.UUID] | None, Query(alias="componentIds")] = None,
    my_vote: MyVoteFilter = None,
    my_complexity: MyComplexityFilter = None,
) -> ListingResponse[ApplicationBoundedContextItem]:
    rows = manager.list_for_application(
        application, component_ids=component_ids, my_vote=my_vote, my_complexity=my_complexity, user_id=member.user_id
    )
    items = [ApplicationBoundedContextItem.model_validate(row) for row in rows]
    manager.enrich(
        EntityType.APPLICATION_BOUNDED_CONTEXT, items, user_id=member.user_id
    )
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_applications_boundedContexts_create",
    summary="Create a bounded context",
    description=(
        "Create a bounded context owned by the caller. Referenced components must belong to the "
        "application. Dev roles only."
    ),
    response_model=ItemResponse[ApplicationBoundedContextItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_bounded_context(
    form: ApplicationBoundedContextCreateForm,
    application: CurrentApplicationDep,
    user: CurrentUserDep,
    manager: ApplicationBoundedContextManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationBoundedContextItem]:
    context = manager.create(
        application,
        user,
        title=form.title,
        description=form.description,
        application_component_ids=form.application_component_ids,
    )
    return ItemResponse(item=ApplicationBoundedContextItem.model_validate(context))


@router.post(
    "/bulk",
    operation_id="api_applications_boundedContexts_bulk_create",
    summary="Create several bounded contexts at once",
    description=(
        "Create 1 to 50 bounded contexts in a single call — prefer this over calling "
        "`api_applications_boundedContexts_create` in a loop when adding many. Best-effort: each "
        "context is created independently, so one failing item does not roll back the others. "
        "Always returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the single "
        "create. Dev roles only."
    ),
    response_model=BulkCreateResponse[ApplicationBoundedContextItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_bounded_contexts(
    body: BulkCreateRequest[ApplicationBoundedContextCreateForm],
    application: CurrentApplicationDep,
    user: CurrentUserDep,
    manager: ApplicationBoundedContextManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> BulkCreateResponse[ApplicationBoundedContextItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            application,
            user,
            title=form.title,
            description=form.description,
            application_component_ids=form.application_component_ids,
        ),
        serialize=ApplicationBoundedContextItem.model_validate,
    )


@router.get(
    "/{bounded_context_id}",
    operation_id="api_applications_boundedContexts_get",
    summary="Get a bounded context",
    description="Return a single bounded context of the application. Any member may read.",
    response_model=ItemResponse[ApplicationBoundedContextItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_bounded_context(
    member: CurrentAccountUserDep,
    context: CurrentApplicationBoundedContextDep,
    manager: ApplicationBoundedContextManagerDep,
) -> ItemResponse[ApplicationBoundedContextItem]:
    item = ApplicationBoundedContextItem.model_validate(context)
    manager.enrich_one(
        EntityType.APPLICATION_BOUNDED_CONTEXT, item, user_id=member.user_id
    )
    return ItemResponse(item=item)


@router.patch(
    "/{bounded_context_id}",
    operation_id="api_applications_boundedContexts_update",
    summary="Update a bounded context",
    description=(
        "Partially update a bounded context. Referenced components must belong to the "
        "application. Dev roles only; refused while the context is locked."
    ),
    response_model=ItemResponse[ApplicationBoundedContextItem],
    responses={**_FORBIDDEN, **_NOT_FOUND, **_LOCKED},
)
def update_bounded_context(
    form: ApplicationBoundedContextPatchForm,
    application: CurrentApplicationDep,
    context: CurrentApplicationBoundedContextDep,
    manager: ApplicationBoundedContextManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationBoundedContextItem]:
    updated = manager.update(application, context, form.model_dump(exclude_unset=True))
    return ItemResponse(item=ApplicationBoundedContextItem.model_validate(updated))


@router.delete(
    "/{bounded_context_id}",
    operation_id="api_applications_boundedContexts_delete",
    summary="Delete a bounded context",
    description=(
        "Soft-delete a bounded context; the components it held are untouched. Dev roles only; "
        "refused while the context is locked."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND, **_LOCKED},
)
def delete_bounded_context(
    context: CurrentApplicationBoundedContextDep,
    manager: ApplicationBoundedContextManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> None:
    manager.soft_delete(context)


_LOCK_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


@router.post(
    "/{bounded_context_id}/lock",
    operation_id="api_applications_boundedContexts_lock",
    summary="Lock a bounded context",
    description=(
        "Freeze the bounded context against edits and deletion; comments, votes and complexity "
        "estimates stay available. Owners and administrators only."
    ),
    response_model=ItemResponse[ApplicationBoundedContextItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def lock_bounded_context(
    entity: CurrentApplicationBoundedContextDep,
    user: CurrentUserDep,
    manager: ApplicationBoundedContextManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[ApplicationBoundedContextItem]:
    return ItemResponse(
        item=ApplicationBoundedContextItem.model_validate(manager.lock(entity, user))
    )


@router.post(
    "/{bounded_context_id}/unlock",
    operation_id="api_applications_boundedContexts_unlock",
    summary="Unlock a bounded context",
    description="Lift the freeze on the bounded context. Owners and administrators only.",
    response_model=ItemResponse[ApplicationBoundedContextItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def unlock_bounded_context(
    entity: CurrentApplicationBoundedContextDep,
    manager: ApplicationBoundedContextManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[ApplicationBoundedContextItem]:
    return ItemResponse(
        item=ApplicationBoundedContextItem.model_validate(manager.unlock(entity))
    )
