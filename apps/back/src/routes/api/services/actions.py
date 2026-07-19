# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/services/{service_id}/actions`.

Actions exposed by a service. Reads are open to any account member; writes are
restricted to owners, administrators, lead developers and developers.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.filters._base import MyVoteFilter
from src.forms._bulk import BulkCreateRequest
from src.forms.services import ServiceActionCreateForm, ServiceActionPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.errors import ErrorResponse
from src.serializes.services import ServiceActionItem
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentServiceActionDep,
    CurrentServiceDep,
    CurrentUserDep,
    ServiceActionManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/services/{service_id}/actions",
    tags=["api.services.actions"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Service or action not found"}}

_DEV = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DEVELOPER,
)


@router.get(
    "",
    operation_id="api_services_actions_list",
    summary="List service actions",
    description="List the actions of a service, most recent first. Any member may read.",
    response_model=ListingResponse[ServiceActionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_actions(
    member: CurrentAccountUserDep,
    service: CurrentServiceDep,
    manager: ServiceActionManagerDep,
    my_vote: MyVoteFilter = None,
) -> ListingResponse[ServiceActionItem]:
    items = manager.enrich(
        EntityType.SERVICE_ACTION,
        [
            ServiceActionItem.model_validate(row)
            for row in manager.list_for_service(service, my_vote=my_vote, user_id=member.user_id)
        ],
        user_id=member.user_id,
    )
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_services_actions_create",
    summary="Create a service action",
    description="Create an action. It starts as a draft owned by the caller. Dev roles only.",
    response_model=ItemResponse[ServiceActionItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_action(
    form: ServiceActionCreateForm,
    service: CurrentServiceDep,
    user: CurrentUserDep,
    manager: ServiceActionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ServiceActionItem]:
    action = manager.create(
        service,
        user,
        type=form.type,
        title=form.title,
        description=form.description,
        method=form.method,
        path=form.path,
    )
    return ItemResponse(item=ServiceActionItem.model_validate(action))


@router.post(
    "/bulk",
    operation_id="api_services_actions_bulk_create",
    summary="Create several service actions at once",
    description=(
        "Create 1 to 50 actions in a single call — prefer this over calling "
        "`api_services_actions_create` in a loop when adding many. Best-effort: each action is "
        "created independently, so one failing item does not roll back the others. Always "
        "returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the "
        "single create. Dev roles only."
    ),
    response_model=BulkCreateResponse[ServiceActionItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_actions(
    body: BulkCreateRequest[ServiceActionCreateForm],
    service: CurrentServiceDep,
    user: CurrentUserDep,
    manager: ServiceActionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> BulkCreateResponse[ServiceActionItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            service,
            user,
            type=form.type,
            title=form.title,
            description=form.description,
            method=form.method,
            path=form.path,
        ),
        serialize=ServiceActionItem.model_validate,
    )


@router.get(
    "/{action_id}",
    operation_id="api_services_actions_get",
    summary="Get a service action",
    description="Return a single action of the service. Any member may read.",
    response_model=ItemResponse[ServiceActionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_action(
    _: CurrentAccountUserDep, action: CurrentServiceActionDep, manager: ServiceActionManagerDep
) -> ItemResponse[ServiceActionItem]:
    return ItemResponse(item=manager.enrich_one(EntityType.SERVICE_ACTION, ServiceActionItem.model_validate(action)))


@router.patch(
    "/{action_id}",
    operation_id="api_services_actions_update",
    summary="Update a service action",
    description="Partially update an action (type, title, description, method, path, status). Dev roles only.",
    response_model=ItemResponse[ServiceActionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_action(
    form: ServiceActionPatchForm,
    action: CurrentServiceActionDep,
    manager: ServiceActionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ServiceActionItem]:
    updated = manager.apply_update(action, form.model_dump(exclude_unset=True))
    return ItemResponse(item=ServiceActionItem.model_validate(updated))


@router.delete(
    "/{action_id}",
    operation_id="api_services_actions_delete",
    summary="Delete a service action",
    description="Soft-delete a single action. Dev roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_action(
    action: CurrentServiceActionDep,
    manager: ServiceActionManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> None:
    manager.soft_delete(action)


_LOCK_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


@router.post(
    "/{action_id}/lock",
    operation_id="api_services_actions_lock",
    summary="Lock an action",
    description=(
        "Freeze the action against edits and deletion; comments, votes and child "
        "entities stay available. Owners and administrators only."
    ),
    response_model=ItemResponse[ServiceActionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def lock_action(
    entity: CurrentServiceActionDep,
    user: CurrentUserDep,
    manager: ServiceActionManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[ServiceActionItem]:
    return ItemResponse(item=ServiceActionItem.model_validate(manager.lock(entity, user)))


@router.post(
    "/{action_id}/unlock",
    operation_id="api_services_actions_unlock",
    summary="Unlock an action",
    description="Lift the freeze on the action. Owners and administrators only.",
    response_model=ItemResponse[ServiceActionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def unlock_action(
    entity: CurrentServiceActionDep,
    manager: ServiceActionManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[ServiceActionItem]:
    return ItemResponse(item=ServiceActionItem.model_validate(manager.unlock(entity)))
