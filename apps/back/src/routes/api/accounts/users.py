"""`/v1/accounts/{account_id}/users` — members of an account.

Reads are open to any member; role changes and removals are restricted to
owners/administrators and go through the manager's invariant guards
(no self-target, owner-only-grants-owner, keep one active owner).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.account_users import AccountUserPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.models.user import User
from src.serializes._base import ItemResponse, ListingResponse, SuccessResponse
from src.serializes.account_users import AccountUserItem, AccountUserUserRefItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    AccountUsersManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    TargetAccountUserDep,
)
from src.utils.middlewares import require_role

router = APIRouter(prefix="/accounts/{account_id}/users", tags=["api.accounts.users"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account or member not found"}}
_CONFLICT = {409: {"model": ErrorResponse, "description": "Would leave the account without an owner"}}

_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


def _member_item(account_user: AccountUser, user: User) -> AccountUserItem:
    return AccountUserItem(
        id=account_user.id,
        role=account_user.role,
        type=account_user.type,
        status=account_user.status,
        start_date=account_user.start_date,
        end_date=account_user.end_date,
        user=AccountUserUserRefItem.model_validate(user),
    )


@router.get(
    "",
    operation_id="api.accounts.users.list",
    summary="List account members",
    description="List every member of the account with their role, type and status. Any member may read.",
    response_model=ListingResponse[AccountUserItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_members(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: AccountUsersManagerDep,
) -> ListingResponse[AccountUserItem]:
    items = [_member_item(account_user, user) for account_user, user in manager.list_for_account(account)]
    return ListingResponse.single_page(items)


@router.get(
    "/{account_user_id}",
    operation_id="api.accounts.users.get",
    summary="Get an account member",
    description="Return a single member of the account.",
    response_model=ItemResponse[AccountUserItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_member(
    _: CurrentAccountUserDep, target: TargetAccountUserDep
) -> ItemResponse[AccountUserItem]:
    return ItemResponse(item=_member_item(target, target.user))


@router.patch(
    "/{account_user_id}",
    operation_id="api.accounts.users.update",
    summary="Change a member's role",
    description=(
        "Change a member's role. Owners/administrators only. You cannot change your "
        "own role, only an owner can grant the owner role, and the last owner cannot be demoted."
    ),
    response_model=ItemResponse[AccountUserItem],
    responses={**_FORBIDDEN, **_NOT_FOUND, **_CONFLICT},
)
def update_member_role(
    form: AccountUserPatchForm,
    target: TargetAccountUserDep,
    manager: AccountUsersManagerDep,
    caller: Annotated[AccountUser, Depends(_ADMIN)],
) -> ItemResponse[AccountUserItem]:
    updated = manager.update_role(target, form.role, caller=caller)
    return ItemResponse(item=_member_item(updated, updated.user))


@router.delete(
    "/{account_user_id}",
    operation_id="api.accounts.users.delete",
    summary="Remove a member",
    description=(
        "Remove a member from the account. Owners/administrators only. You cannot "
        "remove yourself, and the last owner cannot be removed."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND, **_CONFLICT},
)
def delete_member(
    target: TargetAccountUserDep,
    manager: AccountUsersManagerDep,
    caller: Annotated[AccountUser, Depends(_ADMIN)],
) -> None:
    manager.soft_delete(target, caller=caller)


@router.post(
    "/{account_user_id}/leave",
    operation_id="api.accounts.users.leave",
    summary="Force a member out",
    description=(
        "Deactivate a member's seat, keeping the row for audit. Owners/administrators "
        "only; you cannot target yourself (use the account leave endpoint)."
    ),
    response_model=SuccessResponse,
    responses={**_FORBIDDEN, **_NOT_FOUND, **_CONFLICT},
)
def leave_member(
    target: TargetAccountUserDep,
    manager: AccountUsersManagerDep,
    caller: Annotated[AccountUser, Depends(_ADMIN)],
) -> SuccessResponse:
    manager.leave_member(target, caller=caller)
    return SuccessResponse()
