"""`/v1/accounts/{account_id}/invitations` — invite members to an account.

Entirely restricted to owners/administrators (router-level guard). Creating an
invitation emails the recipient a deep-link to `/me/invitations`.
"""

from typing import Annotated

from fastapi import APIRouter, Depends

from src.forms.account_invitations import CreateAccountInvitationsForm, UpdateAccountInvitationForm
from src.models.account_user import AccountUser
from src.models.account_user_invitation import AccountUserInvitation
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.account_invitations import AccountInvitationItem, AccountInvitationOwnerItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    AccountInvitationsManagerDep,
    CurrentAccountDep,
    CurrentAccountInvitationDep,
)
from src.utils.middlewares import require_role

_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)

router = APIRouter(
    prefix="/accounts/{account_id}/invitations",
    tags=["api.accounts.invitations"],
    dependencies=[Depends(_ADMIN)],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account or invitation not found"}}
_CONFLICT = {409: {"model": ErrorResponse, "description": "Invitation is not in a state allowing this action"}}


def _invitation_item(invitation: AccountUserInvitation) -> AccountInvitationItem:
    owner = None
    if invitation.owner is not None:
        owner = AccountInvitationOwnerItem.model_validate(invitation.owner)
    return AccountInvitationItem(
        id=invitation.id,
        email=invitation.email,
        role=invitation.role,
        type=invitation.type,
        status=invitation.status,
        date=invitation.date,
        status_date=invitation.status_date,
        expire_date=invitation.expire_date,
        owner=owner,
    )


@router.get(
    "",
    operation_id="api.accounts.invitations.list",
    summary="List account invitations",
    description="List all invitations of the account (pending and resolved). Owners/administrators only.",
    response_model=ListingResponse[AccountInvitationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_invitations(
    account: CurrentAccountDep, manager: AccountInvitationsManagerDep
) -> ListingResponse[AccountInvitationItem]:
    items = [_invitation_item(invitation) for invitation in manager.list_for_account(account)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api.accounts.invitations.create",
    summary="Invite members",
    description=(
        "Invite one or more emails to the account with a single role. Emails already "
        "pending are skipped; each new invitation is emailed. Only an owner can invite an owner. "
        "Returns the newly-created invitations."
    ),
    response_model=ListingResponse[AccountInvitationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_invitations(
    form: CreateAccountInvitationsForm,
    account: CurrentAccountDep,
    manager: AccountInvitationsManagerDep,
    caller: Annotated[AccountUser, Depends(_ADMIN)],
) -> ListingResponse[AccountInvitationItem]:
    created = manager.create_many(
        account, emails=[str(email) for email in form.emails], role=form.role, caller=caller
    )
    return ListingResponse.single_page([_invitation_item(invitation) for invitation in created])


@router.get(
    "/{invitation_id}",
    operation_id="api.accounts.invitations.get",
    summary="Get an invitation",
    description="Return a single invitation of the account.",
    response_model=ItemResponse[AccountInvitationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_invitation(invitation: CurrentAccountInvitationDep) -> ItemResponse[AccountInvitationItem]:
    return ItemResponse(item=_invitation_item(invitation))


@router.put(
    "/{invitation_id}",
    operation_id="api.accounts.invitations.update",
    summary="Change an invitation's role",
    description="Change the role of a pending invitation. Only an owner can set the owner role.",
    response_model=ItemResponse[AccountInvitationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND, **_CONFLICT},
)
def update_invitation(
    form: UpdateAccountInvitationForm,
    invitation: CurrentAccountInvitationDep,
    manager: AccountInvitationsManagerDep,
    caller: Annotated[AccountUser, Depends(_ADMIN)],
) -> ItemResponse[AccountInvitationItem]:
    updated = manager.update_role(invitation, role=form.role, caller=caller)
    return ItemResponse(item=_invitation_item(updated))


@router.delete(
    "/{invitation_id}",
    operation_id="api.accounts.invitations.cancel",
    summary="Cancel an invitation",
    description="Cancel a pending invitation. Returns the cancelled invitation.",
    response_model=ItemResponse[AccountInvitationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND, **_CONFLICT},
)
def cancel_invitation(
    invitation: CurrentAccountInvitationDep, manager: AccountInvitationsManagerDep
) -> ItemResponse[AccountInvitationItem]:
    cancelled = manager.cancel(invitation)
    return ItemResponse(item=_invitation_item(cancelled))


@router.post(
    "/{invitation_id}/resend",
    operation_id="api.accounts.invitations.resend",
    summary="Resend an invitation",
    description=(
        "Re-send a standby or expired invitation with a fresh 7-day expiry (same link). "
        "The recipient is emailed again."
    ),
    response_model=ItemResponse[AccountInvitationItem],
    responses={**_FORBIDDEN, **_NOT_FOUND, **_CONFLICT},
)
def resend_invitation(
    account: CurrentAccountDep,
    invitation: CurrentAccountInvitationDep,
    manager: AccountInvitationsManagerDep,
) -> ItemResponse[AccountInvitationItem]:
    resent = manager.resend(invitation, account)
    return ItemResponse(item=_invitation_item(resent))
