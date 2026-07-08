"""`/v1/accounts/{account_id}/applications/{application_id}/roles`.

Authorization roles of an application. Reads are open to any account member;
writes are open to every contributing role (everyone except commentators).
Deleting a role detaches it from every route that referenced it.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.application_routes import ApplicationRoleCreateForm, ApplicationRolePatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, ApplicationRoleStatus
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.application_routes import ApplicationRoleItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    ApplicationRoleManagerDep,
    CurrentAccountUserDep,
    CurrentApplicationDep,
    CurrentApplicationRoleDep,
    CurrentUserDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/roles",
    tags=["api.applications.roles"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Application or role not found"}}

_CONTRIBUTOR = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.PRODUCT_OWNER,
    AccountUserRole.QA_MANAGER,
    AccountUserRole.DEVELOPER,
    AccountUserRole.DATA_ANALYST,
)


@router.get(
    "",
    operation_id="api.applications.roles.list",
    summary="List roles",
    description="List the authorization roles of an application, most recent first. Any member may read.",
    response_model=ListingResponse[ApplicationRoleItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_roles(
    _: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: ApplicationRoleManagerDep,
) -> ListingResponse[ApplicationRoleItem]:
    items = [ApplicationRoleItem.model_validate(row) for row in manager.list_for_application(application)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api.applications.roles.create",
    summary="Create a role",
    description="Create an authorization role. It starts as a draft owned by the caller. Contributors only.",
    response_model=ItemResponse[ApplicationRoleItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_role(
    form: ApplicationRoleCreateForm,
    application: CurrentApplicationDep,
    user: CurrentUserDep,
    manager: ApplicationRoleManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> ItemResponse[ApplicationRoleItem]:
    role = manager.create(application, user, title=form.title, description=form.description)
    return ItemResponse(item=ApplicationRoleItem.model_validate(role))


@router.get(
    "/{role_id}",
    operation_id="api.applications.roles.get",
    summary="Get a role",
    description="Return a single role of the application. Any member may read.",
    response_model=ItemResponse[ApplicationRoleItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_role(
    _: CurrentAccountUserDep, role: CurrentApplicationRoleDep
) -> ItemResponse[ApplicationRoleItem]:
    return ItemResponse(item=ApplicationRoleItem.model_validate(role))


@router.patch(
    "/{role_id}",
    operation_id="api.applications.roles.update",
    summary="Update a role",
    description="Partially update a role (title, description). Contributors only.",
    response_model=ItemResponse[ApplicationRoleItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_role(
    form: ApplicationRolePatchForm,
    role: CurrentApplicationRoleDep,
    manager: ApplicationRoleManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> ItemResponse[ApplicationRoleItem]:
    updated = manager.apply_update(role, form.model_dump(exclude_unset=True))
    return ItemResponse(item=ApplicationRoleItem.model_validate(updated))


@router.post(
    "/{role_id}/activate",
    operation_id="api.applications.roles.activate",
    summary="Activate a role",
    description="Set the role status to active. Contributors only.",
    response_model=ItemResponse[ApplicationRoleItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def activate_role(
    role: CurrentApplicationRoleDep,
    manager: ApplicationRoleManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> ItemResponse[ApplicationRoleItem]:
    updated = manager.set_status(role, ApplicationRoleStatus.ACTIVE)
    return ItemResponse(item=ApplicationRoleItem.model_validate(updated))


@router.post(
    "/{role_id}/archive",
    operation_id="api.applications.roles.archive",
    summary="Archive a role",
    description="Set the role status to archived. Contributors only.",
    response_model=ItemResponse[ApplicationRoleItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def archive_role(
    role: CurrentApplicationRoleDep,
    manager: ApplicationRoleManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> ItemResponse[ApplicationRoleItem]:
    updated = manager.set_status(role, ApplicationRoleStatus.ARCHIVED)
    return ItemResponse(item=ApplicationRoleItem.model_validate(updated))


@router.delete(
    "/{role_id}",
    operation_id="api.applications.roles.delete",
    summary="Delete a role",
    description="Soft-delete a role and detach it from every route that referenced it. Contributors only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_role(
    role: CurrentApplicationRoleDep,
    manager: ApplicationRoleManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> None:
    manager.soft_delete(role)
