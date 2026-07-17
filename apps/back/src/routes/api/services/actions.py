# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/services/{service_id}/actions`.

Actions exposed by a service. Reads are open to any account member; writes are
restricted to owners, administrators, lead developers and developers.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.services import ServiceActionCreateForm, ServiceActionPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.errors import ErrorResponse
from src.serializes.services import ServiceActionItem
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
    _: CurrentAccountUserDep,
    service: CurrentServiceDep,
    manager: ServiceActionManagerDep,
) -> ListingResponse[ServiceActionItem]:
    items = [ServiceActionItem.model_validate(row) for row in manager.list_for_service(service)]
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


@router.get(
    "/{action_id}",
    operation_id="api_services_actions_get",
    summary="Get a service action",
    description="Return a single action of the service. Any member may read.",
    response_model=ItemResponse[ServiceActionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_action(
    _: CurrentAccountUserDep, action: CurrentServiceActionDep
) -> ItemResponse[ServiceActionItem]:
    return ItemResponse(item=ServiceActionItem.model_validate(action))


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
