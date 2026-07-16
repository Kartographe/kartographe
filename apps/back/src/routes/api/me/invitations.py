# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/me/invitations` — invitations addressed to the signed-in user.

Root-mounted (unversioned, like the rest of `/me`) and excluded from the MCP
tool surface. Invitations are matched to the user by email; accepting one joins
the account as a guest.
"""

from uuid import UUID

from fastapi import APIRouter, status

from src.models.account_user_invitation import AccountUserInvitation
from src.models.enum import AccountUserInvitationStatus
from src.serializes._base import ItemResponse, ListingResponse, SuccessResponse
from src.serializes.errors import ErrorResponse
from src.serializes.me_invitations import (
    MeInvitationAccountItem,
    MeInvitationItem,
    MeInvitationOwnerItem,
)
from src.utils.dependencies import CurrentUserDep, MeInvitationsManagerDep

router = APIRouter(prefix="/me/invitations", tags=["api.me.invitations"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Invitation not found"}}
_CONFLICT = {409: {"model": ErrorResponse, "description": "Invitation is no longer pending"}}


def _owner_name(invitation: AccountUserInvitation) -> str | None:
    owner = invitation.owner
    if owner is None:
        return None
    full = " ".join(part for part in (owner.first_name, owner.last_name) if part).strip()
    return full or owner.email


def _invitation_item(invitation: AccountUserInvitation) -> MeInvitationItem:
    owner = None
    if invitation.owner is not None:
        owner = MeInvitationOwnerItem(id=invitation.owner_id, name=_owner_name(invitation))
    return MeInvitationItem(
        id=invitation.id,
        role=invitation.role,
        type=invitation.type,
        status=invitation.status,
        date=invitation.date,
        status_date=invitation.status_date,
        expire_date=invitation.expire_date,
        account=MeInvitationAccountItem(id=invitation.account.id, name=invitation.account.name),
        owner=owner,
    )


@router.get(
    "",
    operation_id="api.me.invitations.list",
    summary="List my invitations",
    description="List invitations addressed to the signed-in user's email, optionally filtered by status.",
    response_model=ListingResponse[MeInvitationItem],
)
def list_invitations(
    user: CurrentUserDep,
    manager: MeInvitationsManagerDep,
    invitation_status: AccountUserInvitationStatus | None = None,
) -> ListingResponse[MeInvitationItem]:
    invitations = manager.list_for_user(user, invitation_status=invitation_status)
    return ListingResponse.single_page([_invitation_item(invitation) for invitation in invitations])


@router.get(
    "/{invitation_id}",
    operation_id="api.me.invitations.get",
    summary="Get one of my invitations",
    description="Return a single invitation addressed to the signed-in user.",
    response_model=ItemResponse[MeInvitationItem],
    responses=_NOT_FOUND,
)
def get_invitation(
    invitation_id: UUID, user: CurrentUserDep, manager: MeInvitationsManagerDep
) -> ItemResponse[MeInvitationItem]:
    return ItemResponse(item=_invitation_item(manager.get(user, invitation_id)))


@router.post(
    "/{invitation_id}/accept",
    operation_id="api.me.invitations.accept",
    summary="Accept an invitation",
    description="Accept a pending invitation and join the account as a guest member.",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    responses={**_NOT_FOUND, **_CONFLICT},
)
def accept_invitation(
    invitation_id: UUID, user: CurrentUserDep, manager: MeInvitationsManagerDep
) -> SuccessResponse:
    manager.accept(user, invitation_id)
    return SuccessResponse()


@router.post(
    "/{invitation_id}/refuse",
    operation_id="api.me.invitations.refuse",
    summary="Refuse an invitation",
    description="Decline a pending invitation.",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    responses={**_NOT_FOUND, **_CONFLICT},
)
def refuse_invitation(
    invitation_id: UUID, user: CurrentUserDep, manager: MeInvitationsManagerDep
) -> SuccessResponse:
    manager.refuse(user, invitation_id)
    return SuccessResponse()
