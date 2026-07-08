"""Recipient-side invitations (the signed-in user's pending seats).

Invitations are matched to the user by **email**. Accepting one creates a guest
membership referencing the invitation; refusing marks it refused.
"""

import uuid

from fastapi import HTTPException, status
from sqlmodel import Session, select

from src.models.account_user import AccountUser
from src.models.account_user_invitation import AccountUserInvitation
from src.models.enum import (
    AccountUserInvitationStatus,
    AccountUserStatus,
    AccountUserType,
)
from src.models.user import User
from src.utils.datetime import FAR_FUTURE, utc_now


class MeInvitationsManager:
    def __init__(self, session: Session):
        self.session = session

    def _user_email(self, user: User) -> str:
        return user.email.strip().lower()

    def list_for_user(
        self, user: User, *, invitation_status: AccountUserInvitationStatus | None = None
    ) -> list[AccountUserInvitation]:
        query = (
            select(AccountUserInvitation)
            .where(
                AccountUserInvitation.email == self._user_email(user),
                AccountUserInvitation.enabled.is_(True),
            )
            .order_by(AccountUserInvitation.date.desc())
        )
        if invitation_status is not None:
            query = query.where(AccountUserInvitation.status == invitation_status)
        return list(self.session.exec(query).all())

    def get(self, user: User, invitation_id: uuid.UUID) -> AccountUserInvitation:
        invitation = self.session.get(AccountUserInvitation, invitation_id)
        if (
            invitation is None
            or not invitation.enabled
            or invitation.email != self._user_email(user)
        ):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation not found.")
        return invitation

    def _take_pending(self, user: User, invitation_id: uuid.UUID) -> AccountUserInvitation:
        """Load a still-pending invitation, lazily expiring a stale one."""
        invitation = self.get(user, invitation_id)
        now = utc_now()
        if (
            invitation.status == AccountUserInvitationStatus.STANDBY
            and invitation.expire_date is not None
            and invitation.expire_date < now
        ):
            invitation.status = AccountUserInvitationStatus.EXPIRED
            invitation.status_date = now
            self.session.add(invitation)
            self.session.commit()
            self.session.refresh(invitation)
        if invitation.status != AccountUserInvitationStatus.STANDBY:
            raise HTTPException(status.HTTP_409_CONFLICT, "This invitation is no longer pending.")
        return invitation

    def accept(self, user: User, invitation_id: uuid.UUID) -> AccountUser:
        invitation = self._take_pending(user, invitation_id)
        existing = self.session.exec(
            select(AccountUser).where(
                AccountUser.account_id == invitation.account_id,
                AccountUser.user_id == user.id,
                AccountUser.status == AccountUserStatus.ACTIVE,
                AccountUser.enabled.is_(True),
            )
        ).first()
        if existing is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "You are already a member of this account.")

        now = utc_now()
        invitation.status = AccountUserInvitationStatus.ACCEPTED
        invitation.status_date = now
        self.session.add(invitation)

        membership = AccountUser(
            type=AccountUserType.GUEST,
            status=AccountUserStatus.ACTIVE,
            role=invitation.role,
            date=now,
            start_date=now,
            end_date=FAR_FUTURE,
            account_id=invitation.account_id,
            user_id=user.id,
            account_user_invitation_id=invitation.id,
        )
        self.session.add(membership)
        self.session.commit()
        self.session.refresh(membership)
        return membership

    def refuse(self, user: User, invitation_id: uuid.UUID) -> AccountUserInvitation:
        invitation = self._take_pending(user, invitation_id)
        now = utc_now()
        invitation.status = AccountUserInvitationStatus.REFUSED
        invitation.status_date = now
        self.session.add(invitation)
        self.session.commit()
        self.session.refresh(invitation)
        return invitation
