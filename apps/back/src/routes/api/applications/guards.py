"""`/v1/accounts/{account_id}/applications/{application_id}/guards`.

Authentication guards of an application. Reads are open to any account member;
writes are restricted to owners, administrators, lead developers and developers.
Deleting a guard detaches it from every route that referenced it.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.application_routes import ApplicationGuardCreateForm, ApplicationGuardPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, ApplicationGuardStatus
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.application_routes import ApplicationGuardItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    ApplicationGuardManagerDep,
    CurrentAccountUserDep,
    CurrentApplicationDep,
    CurrentApplicationGuardDep,
    CurrentUserDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/guards",
    tags=["api.applications.guards"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Application or guard not found"}}

_DEV = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DEVELOPER,
)


@router.get(
    "",
    operation_id="api.applications.guards.list",
    summary="List guards",
    description="List the authentication guards of an application, most recent first. Any member may read.",
    response_model=ListingResponse[ApplicationGuardItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_guards(
    _: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: ApplicationGuardManagerDep,
) -> ListingResponse[ApplicationGuardItem]:
    items = [ApplicationGuardItem.model_validate(row) for row in manager.list_for_application(application)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api.applications.guards.create",
    summary="Create a guard",
    description="Create an authentication guard. It starts as a draft owned by the caller. Dev roles only.",
    response_model=ItemResponse[ApplicationGuardItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_guard(
    form: ApplicationGuardCreateForm,
    application: CurrentApplicationDep,
    user: CurrentUserDep,
    manager: ApplicationGuardManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationGuardItem]:
    guard = manager.create(
        application,
        user,
        type=form.type,
        title=form.title,
        field_type=form.field_type,
        field_key=form.field_key,
        field_format=form.field_format,
        tag_ids=form.tag_ids,
    )
    return ItemResponse(item=ApplicationGuardItem.model_validate(guard))


@router.get(
    "/{guard_id}",
    operation_id="api.applications.guards.get",
    summary="Get a guard",
    description="Return a single guard of the application. Any member may read.",
    response_model=ItemResponse[ApplicationGuardItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_guard(
    _: CurrentAccountUserDep, guard: CurrentApplicationGuardDep
) -> ItemResponse[ApplicationGuardItem]:
    return ItemResponse(item=ApplicationGuardItem.model_validate(guard))


@router.patch(
    "/{guard_id}",
    operation_id="api.applications.guards.update",
    summary="Update a guard",
    description="Partially update a guard (type, title, field type/key/format). Dev roles only.",
    response_model=ItemResponse[ApplicationGuardItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_guard(
    form: ApplicationGuardPatchForm,
    guard: CurrentApplicationGuardDep,
    manager: ApplicationGuardManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationGuardItem]:
    updated = manager.apply_update(guard, form.model_dump(exclude_unset=True))
    return ItemResponse(item=ApplicationGuardItem.model_validate(updated))


@router.post(
    "/{guard_id}/activate",
    operation_id="api.applications.guards.activate",
    summary="Activate a guard",
    description="Set the guard status to active. Dev roles only.",
    response_model=ItemResponse[ApplicationGuardItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def activate_guard(
    guard: CurrentApplicationGuardDep,
    manager: ApplicationGuardManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationGuardItem]:
    updated = manager.set_status(guard, ApplicationGuardStatus.ACTIVE)
    return ItemResponse(item=ApplicationGuardItem.model_validate(updated))


@router.post(
    "/{guard_id}/archive",
    operation_id="api.applications.guards.archive",
    summary="Archive a guard",
    description="Set the guard status to archived. Dev roles only.",
    response_model=ItemResponse[ApplicationGuardItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def archive_guard(
    guard: CurrentApplicationGuardDep,
    manager: ApplicationGuardManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ApplicationGuardItem]:
    updated = manager.set_status(guard, ApplicationGuardStatus.ARCHIVED)
    return ItemResponse(item=ApplicationGuardItem.model_validate(updated))


@router.delete(
    "/{guard_id}",
    operation_id="api.applications.guards.delete",
    summary="Delete a guard",
    description="Soft-delete a guard and detach it from every route that referenced it. Dev roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_guard(
    guard: CurrentApplicationGuardDep,
    manager: ApplicationGuardManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> None:
    manager.soft_delete(guard)
