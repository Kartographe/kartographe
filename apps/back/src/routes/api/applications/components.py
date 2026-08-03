# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/applications/{application_id}/components`.

The building blocks an application is made of. Reads are open to any account
member; writes are restricted to the dev roles, and locking to the
owners/administrators.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.filters._base import MyVoteFilter
from src.forms._bulk import BulkCreateRequest
from src.forms.application_components import (
    ApplicationComponentCreateForm,
    ApplicationComponentPatchForm,
)
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.application_components import ApplicationComponentItem
from src.serializes.bulk import BulkCreateResponse
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    ApplicationComponentManagerDep,
    CurrentAccountUserDep,
    CurrentApplicationComponentDep,
    CurrentApplicationDep,
    CurrentUserDep,
    TagManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/components",
    tags=["api.applications.components"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Application or component not found"}}
_LOCKED = {409: {"model": ErrorResponse, "description": "Component is locked"}}

_DEV = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DEVELOPER,
)


@router.get(
    "",
    operation_id="api_applications_components_list",
    summary="List components",
    description=(
        "List the components of an application, most recent first. Any member may read. "
        "Filter with `tagIds` (repeat the query param) to keep only the entities carrying at least one of those tags."
    ),
    response_model=ListingResponse[ApplicationComponentItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_components(
    member: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: ApplicationComponentManagerDep,
    tags: TagManagerDep,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
    my_vote: MyVoteFilter = None,
) -> ListingResponse[ApplicationComponentItem]:
    rows = manager.list_for_application(
        application, tag_ids=tag_ids, my_vote=my_vote, user_id=member.user_id
    )
    items = tags.enrich(
        EntityType.APPLICATION_COMPONENT,
        tags.attach(rows, ApplicationComponentItem),
        user_id=member.user_id,
    )
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_applications_components_create",
    summary="Create a component",
    description="Create a component. It starts as a draft owned by the caller. Dev roles only.",
    response_model=ItemResponse[ApplicationComponentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_component(
    form: ApplicationComponentCreateForm,
    application: CurrentApplicationDep,
    user: CurrentUserDep,
    manager: ApplicationComponentManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationComponentItem]:
    component = manager.create(
        application,
        user,
        title=form.title,
        type=form.type,
        description=form.description,
        tag_ids=form.tag_ids,
    )
    return ItemResponse(item=ApplicationComponentItem.model_validate(component))


@router.post(
    "/bulk",
    operation_id="api_applications_components_bulk_create",
    summary="Create several components at once",
    description=(
        "Create 1 to 50 components in a single call — prefer this over calling "
        "`api_applications_components_create` in a loop when adding many. Best-effort: each "
        "component is created independently, so one failing item does not roll back the others. "
        "Always returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the single "
        "create. Dev roles only."
    ),
    response_model=BulkCreateResponse[ApplicationComponentItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_components(
    body: BulkCreateRequest[ApplicationComponentCreateForm],
    application: CurrentApplicationDep,
    user: CurrentUserDep,
    manager: ApplicationComponentManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> BulkCreateResponse[ApplicationComponentItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            application,
            user,
            title=form.title,
            type=form.type,
            description=form.description,
            tag_ids=form.tag_ids,
        ),
        serialize=ApplicationComponentItem.model_validate,
    )


@router.get(
    "/{component_id}",
    operation_id="api_applications_components_get",
    summary="Get a component",
    description="Return a single component of the application. Any member may read.",
    response_model=ItemResponse[ApplicationComponentItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_component(
    _: CurrentAccountUserDep,
    component: CurrentApplicationComponentDep,
    tags: TagManagerDep,
) -> ItemResponse[ApplicationComponentItem]:
    return ItemResponse(
        item=tags.enrich_one(
            EntityType.APPLICATION_COMPONENT,
            tags.attach_one(component, ApplicationComponentItem),
        )
    )


@router.patch(
    "/{component_id}",
    operation_id="api_applications_components_update",
    summary="Update a component",
    description="Partially update a component. Dev roles only; refused while the component is locked.",
    response_model=ItemResponse[ApplicationComponentItem],
    responses={**_FORBIDDEN, **_NOT_FOUND, **_LOCKED},
)
def update_component(
    form: ApplicationComponentPatchForm,
    component: CurrentApplicationComponentDep,
    manager: ApplicationComponentManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationComponentItem]:
    updated = manager.apply_update(component, form.model_dump(exclude_unset=True))
    return ItemResponse(item=ApplicationComponentItem.model_validate(updated))


@router.delete(
    "/{component_id}",
    operation_id="api_applications_components_delete",
    summary="Delete a component",
    description="Soft-delete a component. Dev roles only; refused while the component is locked.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND, **_LOCKED},
)
def delete_component(
    component: CurrentApplicationComponentDep,
    manager: ApplicationComponentManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> None:
    manager.soft_delete(component)


_LOCK_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


@router.post(
    "/{component_id}/lock",
    operation_id="api_applications_components_lock",
    summary="Lock a component",
    description=(
        "Freeze the component against edits and deletion; comments, votes and complexity "
        "estimates stay available. Owners and administrators only."
    ),
    response_model=ItemResponse[ApplicationComponentItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def lock_component(
    entity: CurrentApplicationComponentDep,
    user: CurrentUserDep,
    manager: ApplicationComponentManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[ApplicationComponentItem]:
    return ItemResponse(item=ApplicationComponentItem.model_validate(manager.lock(entity, user)))


@router.post(
    "/{component_id}/unlock",
    operation_id="api_applications_components_unlock",
    summary="Unlock a component",
    description="Lift the freeze on the component. Owners and administrators only.",
    response_model=ItemResponse[ApplicationComponentItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def unlock_component(
    entity: CurrentApplicationComponentDep,
    manager: ApplicationComponentManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[ApplicationComponentItem]:
    return ItemResponse(item=ApplicationComponentItem.model_validate(manager.unlock(entity)))
