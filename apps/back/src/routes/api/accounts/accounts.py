# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts` — workspaces the signed-in user belongs to.

Versioned surface, so these are also exposed as MCP tools: an agent holding a
grant acts as its user and can list, create and manage the accounts that user is
a member of. Role-gated writes go through `require_role`.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, UploadFile, status

from src.filters.accounts import AccountSortField
from src.filters._base import PageLimit, SortOrder
from src.forms.accounts import AccountCreateForm, AccountPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountStatus, AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse, SuccessResponse
from src.serializes.accounts import AccountItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    AccountManagerDep,
    AccountUsersManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentUserDep,
)
from src.utils.middlewares import require_role

router = APIRouter(prefix="/accounts", tags=["api.accounts"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account not found"}}

_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


@router.get(
    "",
    operation_id="api_accounts_list",
    summary="List my accounts",
    description=(
        "List the workspaces the signed-in user is an active member of, with their role in each. "
        "Filter by account status and/or membership role (repeat the query param for multiple values), "
        "sort by name/createdDate/status/role, and page through results."
    ),
    response_model=ListingResponse[AccountItem],
)
def list_accounts(
    user: CurrentUserDep,
    manager: AccountManagerDep,
    account_status: Annotated[list[AccountStatus] | None, Query(alias="status")] = None,
    role: Annotated[list[AccountUserRole] | None, Query(alias="role")] = None,
    sort_by: Annotated[AccountSortField, Query(alias="sortBy")] = AccountSortField.CREATED_DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[PageLimit, Query()] = PageLimit.L25,
) -> ListingResponse[AccountItem]:
    rows, total = manager.list_for_user(
        user,
        statuses=account_status,
        roles=role,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit.value,
    )
    items = [manager.to_item(account, membership) for membership, account in rows]
    return ListingResponse.paginate(items, count=total, page=page, limit=limit.value)


@router.post(
    "",
    operation_id="api_accounts_create",
    summary="Create an account",
    description="Create a new workspace. The caller automatically becomes its owner.",
    response_model=ItemResponse[AccountItem],
    status_code=status.HTTP_201_CREATED,
)
def create_account(
    form: AccountCreateForm, user: CurrentUserDep, manager: AccountManagerDep
) -> ItemResponse[AccountItem]:
    account, membership = manager.create_account(
        user, name=form.name, language=form.language, time_zone=form.time_zone
    )
    return ItemResponse(item=manager.to_item(account, membership))


@router.get(
    "/{account_id}",
    operation_id="api_accounts_get",
    summary="Get an account",
    description="Return a workspace the caller is a member of, including the caller's role.",
    response_model=ItemResponse[AccountItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_account(
    account: CurrentAccountDep, membership: CurrentAccountUserDep, manager: AccountManagerDep
) -> ItemResponse[AccountItem]:
    return ItemResponse(item=manager.to_item(account, membership))


@router.patch(
    "/{account_id}",
    operation_id="api_accounts_update",
    summary="Update an account",
    description="Partially update a workspace (name, language, time zone). Owners and administrators only.",
    response_model=ItemResponse[AccountItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_account(
    account: CurrentAccountDep,
    form: AccountPatchForm,
    manager: AccountManagerDep,
    membership: Annotated[AccountUser, Depends(_ADMIN)],
) -> ItemResponse[AccountItem]:
    updated = manager.update(account, form.model_dump(exclude_unset=True))
    return ItemResponse(item=manager.to_item(updated, membership))


@router.post(
    "/{account_id}/picture",
    operation_id="api_accounts_setPicture",
    summary="Upload the account logo",
    description=(
        "Upload the account logo (multipart, field `file`). The image is center-cropped "
        "to a square and resized server-side; the previous logo is replaced. "
        "Owners and administrators only."
    ),
    response_model=ItemResponse[AccountItem],
    responses={
        **_FORBIDDEN,
        **_NOT_FOUND,
        400: {"model": ErrorResponse, "description": "Unsupported image format"},
        413: {"model": ErrorResponse, "description": "Image too large"},
    },
)
def set_account_picture(
    account: CurrentAccountDep,
    file: UploadFile,
    manager: AccountManagerDep,
    membership: Annotated[AccountUser, Depends(_ADMIN)],
) -> ItemResponse[AccountItem]:
    updated = manager.set_picture(account, file)
    return ItemResponse(item=manager.to_item(updated, membership))


@router.post(
    "/{account_id}/activate",
    operation_id="api_accounts_activate",
    summary="Activate an account",
    description="Set the account status back to active. Owners only.",
    response_model=ItemResponse[AccountItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def activate_account(
    account: CurrentAccountDep,
    manager: AccountManagerDep,
    membership: Annotated[AccountUser, Depends(require_role(AccountUserRole.OWNER))],
) -> ItemResponse[AccountItem]:
    updated = manager.set_status(account, AccountStatus.ACTIVE)
    return ItemResponse(item=manager.to_item(updated, membership))


@router.post(
    "/{account_id}/deactivate",
    operation_id="api_accounts_deactivate",
    summary="Deactivate an account",
    description="Disable the account (reversible). Owners only. Deletion requires deactivation first.",
    response_model=ItemResponse[AccountItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def deactivate_account(
    account: CurrentAccountDep,
    manager: AccountManagerDep,
    membership: Annotated[AccountUser, Depends(require_role(AccountUserRole.OWNER))],
) -> ItemResponse[AccountItem]:
    updated = manager.set_status(account, AccountStatus.DISABLED)
    return ItemResponse(item=manager.to_item(updated, membership))


@router.delete(
    "/{account_id}",
    operation_id="api_accounts_delete",
    summary="Delete an account",
    description="Soft-delete a deactivated account. Owners only; the account must be deactivated first.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        **_FORBIDDEN,
        **_NOT_FOUND,
        409: {"model": ErrorResponse, "description": "The account must be deactivated first"},
    },
)
def delete_account(
    account: CurrentAccountDep,
    manager: AccountManagerDep,
    _: Annotated[AccountUser, Depends(require_role(AccountUserRole.OWNER))],
) -> None:
    manager.soft_delete(account)


@router.post(
    "/{account_id}/leave",
    operation_id="api_accounts_leave",
    summary="Leave an account",
    description="Leave a workspace you are a member of. The last owner cannot leave.",
    response_model=SuccessResponse,
    responses={
        **_NOT_FOUND,
        409: {"model": ErrorResponse, "description": "The account must keep at least one owner"},
    },
)
def leave_account(membership: CurrentAccountUserDep, manager: AccountUsersManagerDep) -> SuccessResponse:
    manager.leave(membership)
    return SuccessResponse()
