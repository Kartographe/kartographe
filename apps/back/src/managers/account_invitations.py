"""Account-side invitation management (owners/administrators invite members).

Sends one email per newly-created invitation. Enforces the same
owner-only-grants-owner rule as role changes, and the one-standby-per-email
invariant backed by the partial unique index.
"""

import secrets
from datetime import timedelta

from fastapi import HTTPException, status
from sqlmodel import Session, select

from src.managers.account_invitations_notification import AccountInvitationsNotificationManager
from src.models.account import Account
from src.models.account_user import AccountUser
from src.models.account_user_invitation import AccountUserInvitation
from src.models.enum import AccountUserInvitationStatus, AccountUserInvitationType, AccountUserRole
from src.utils.datetime import utc_now

# How long a pending invitation stays valid.
INVITATION_TTL = timedelta(days=7)


class AccountInvitationsManager:
    def __init__(self, session: Session):
        self.session = session
        self._notifications = AccountInvitationsNotificationManager()

    def list_for_account(self, account: Account) -> list[AccountUserInvitation]:
        return list(
            self.session.exec(
                select(AccountUserInvitation)
                .where(
                    AccountUserInvitation.account_id == account.id,
                    AccountUserInvitation.enabled.is_(True),
                )
                .order_by(AccountUserInvitation.date.desc())
            ).all()
        )

    def _assert_role_grantable(self, role: AccountUserRole, caller: AccountUser) -> None:
        if role == AccountUserRole.OWNER and caller.role != AccountUserRole.OWNER:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only an owner can invite another owner.")

    def _standby_emails(self, account: Account) -> set[str]:
        rows = self.session.exec(
            select(AccountUserInvitation.email).where(
                AccountUserInvitation.account_id == account.id,
                AccountUserInvitation.status == AccountUserInvitationStatus.STANDBY,
                AccountUserInvitation.enabled.is_(True),
            )
        ).all()
        return {email.lower() for email in rows}

    def create_many(
        self, account: Account, *, emails: list[str], role: AccountUserRole, caller: AccountUser
    ) -> list[AccountUserInvitation]:
        """Create invitations for the given emails, skipping any already pending.

        Returns only the newly-created invitations (each one emailed)."""
        self._assert_role_grantable(role, caller)
        now = utc_now()
        expire = now + INVITATION_TTL
        already = self._standby_emails(account)

        # Normalize + dedupe within the request while preserving order.
        seen: set[str] = set()
        targets: list[str] = []
        for raw in emails:
            email = raw.strip().lower()
            if email and email not in seen and email not in already:
                seen.add(email)
                targets.append(email)

        created: list[AccountUserInvitation] = []
        for email in targets:
            invitation = AccountUserInvitation(
                type=AccountUserInvitationType.SIMPLE,
                status=AccountUserInvitationStatus.STANDBY,
                role=role,
                date=now,
                status_date=None,
                expire_date=expire,
                email=email,
                token=secrets.token_urlsafe(48),
                account_id=account.id,
                owner_id=caller.user_id,
            )
            self.session.add(invitation)
            created.append(invitation)
        self.session.flush()

        for invitation in created:
            self._notifications.invitation_email(invitation, account, caller.user)
        self.session.commit()
        for invitation in created:
            self.session.refresh(invitation)
        return created

    def update_role(self, invitation: AccountUserInvitation, *, role: AccountUserRole, caller: AccountUser) -> AccountUserInvitation:
        """Change a *pending* invitation's role."""
        if invitation.status != AccountUserInvitationStatus.STANDBY:
            raise HTTPException(status.HTTP_409_CONFLICT, "Only a pending invitation can be updated.")
        self._assert_role_grantable(role, caller)
        invitation.role = role
        invitation.updated_at = utc_now()
        self.session.add(invitation)
        self.session.commit()
        self.session.refresh(invitation)
        return invitation

    def resend(self, invitation: AccountUserInvitation, account: Account) -> AccountUserInvitation:
        """Re-issue a standby/expired invitation with a fresh expiry (same token)."""
        if invitation.status not in (AccountUserInvitationStatus.STANDBY, AccountUserInvitationStatus.EXPIRED):
            raise HTTPException(status.HTTP_409_CONFLICT, "This invitation can no longer be resent.")
        now = utc_now()
        invitation.status = AccountUserInvitationStatus.STANDBY
        invitation.status_date = None
        invitation.expire_date = now + INVITATION_TTL
        invitation.updated_at = now
        self.session.add(invitation)
        self.session.flush()
        self._notifications.invitation_email(invitation, account, invitation.owner)
        self.session.commit()
        self.session.refresh(invitation)
        return invitation

    def cancel(self, invitation: AccountUserInvitation) -> AccountUserInvitation:
        """Cancel a pending invitation."""
        if invitation.status != AccountUserInvitationStatus.STANDBY:
            raise HTTPException(status.HTTP_409_CONFLICT, "Only a pending invitation can be cancelled.")
        now = utc_now()
        invitation.status = AccountUserInvitationStatus.CANCELLED
        invitation.status_date = now
        invitation.updated_at = now
        self.session.add(invitation)
        self.session.commit()
        self.session.refresh(invitation)
        return invitation
