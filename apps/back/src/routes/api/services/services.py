# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/services` — services tracked in an account.

Reads are open to any account member; writes are restricted to owners,
administrators, lead developers and developers. Deleting a service cascades a
soft-delete to its actions.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.filters._base import PageLimit, SortOrder
from src.filters.services import ServiceSortField
from src.forms.services import ServiceCreateForm, ServicePatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, ServiceStatus, ServiceType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.errors import ErrorResponse
from src.serializes.services import ServiceItem
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentServiceDep,
    CurrentUserDep,
    ServiceManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(prefix="/accounts/{account_id}/services", tags=["api.services"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account or service not found"}}

_DEV = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DEVELOPER,
)


@router.get(
    "",
    operation_id="api.services.list",
    summary="List services",
    description=(
        "List the services of the account. Filter by status and/or type (repeat the query param "
        "for multiple values), sort by date/title/status/type, and page through results. "
        "Any member may read."
    ),
    response_model=ListingResponse[ServiceItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_services(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: ServiceManagerDep,
    service_status: Annotated[list[ServiceStatus] | None, Query(alias="status")] = None,
    type: Annotated[list[ServiceType] | None, Query(alias="type")] = None,
    sort_by: Annotated[ServiceSortField, Query(alias="sortBy")] = ServiceSortField.DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[PageLimit, Query()] = PageLimit.L25,
) -> ListingResponse[ServiceItem]:
    rows, total = manager.list_for_account(
        account,
        statuses=service_status,
        types=type,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit.value,
    )
    items = [ServiceItem.model_validate(row) for row in rows]
    return ListingResponse.paginate(items, count=total, page=page, limit=limit.value)


@router.post(
    "",
    operation_id="api.services.create",
    summary="Create a service",
    description="Create a service. It starts as a draft owned by the caller. Dev roles only.",
    response_model=ItemResponse[ServiceItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_service(
    form: ServiceCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    manager: ServiceManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ServiceItem]:
    service = manager.create(
        account,
        user,
        type=form.type,
        title=form.title,
        description=form.description,
        picture_path=form.picture_path,
        url=form.url,
        openapi_url=form.openapi_url,
    )
    return ItemResponse(item=ServiceItem.model_validate(service))


@router.get(
    "/{service_id}",
    operation_id="api.services.get",
    summary="Get a service",
    description="Return a single service of the account. Any member may read.",
    response_model=ItemResponse[ServiceItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_service(_: CurrentAccountUserDep, service: CurrentServiceDep) -> ItemResponse[ServiceItem]:
    return ItemResponse(item=ServiceItem.model_validate(service))


@router.patch(
    "/{service_id}",
    operation_id="api.services.update",
    summary="Update a service",
    description=(
        "Partially update a service (type, title, description, picture, url, OpenAPI url). "
        "Dev roles only."
    ),
    response_model=ItemResponse[ServiceItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_service(
    form: ServicePatchForm,
    service: CurrentServiceDep,
    manager: ServiceManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ServiceItem]:
    updated = manager.apply_update(service, form.model_dump(exclude_unset=True))
    return ItemResponse(item=ServiceItem.model_validate(updated))


@router.post(
    "/{service_id}/activate",
    operation_id="api.services.activate",
    summary="Activate a service",
    description="Set the service status to active. Dev roles only.",
    response_model=ItemResponse[ServiceItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def activate_service(
    service: CurrentServiceDep,
    manager: ServiceManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ServiceItem]:
    updated = manager.set_status(service, ServiceStatus.ACTIVE)
    return ItemResponse(item=ServiceItem.model_validate(updated))


@router.post(
    "/{service_id}/archive",
    operation_id="api.services.archive",
    summary="Archive a service",
    description="Set the service status to archived. Dev roles only.",
    response_model=ItemResponse[ServiceItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def archive_service(
    service: CurrentServiceDep,
    manager: ServiceManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[ServiceItem]:
    updated = manager.set_status(service, ServiceStatus.ARCHIVED)
    return ItemResponse(item=ServiceItem.model_validate(updated))


@router.delete(
    "/{service_id}",
    operation_id="api.services.delete",
    summary="Delete a service",
    description="Soft-delete a service; its actions are soft-deleted as well. Dev roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_service(
    service: CurrentServiceDep,
    manager: ServiceManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> None:
    manager.soft_delete(service)
