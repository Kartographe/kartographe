# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Transactional email for account invitations.

Builds the recipient deep-link (`/me/invitations?id=…&token=…` against
`APP_URL`), renders the template and hands off to `EmailService`. Kept separate
from the invitation business logic, mirroring `AuthNotificationManager`.
"""

from src.models.account import Account
from src.models.account_user_invitation import AccountUserInvitation
from src.models.enum import AccountUserRole
from src.models.user import User
from src.services.email import EmailService
from src.services.email.templates import invitation_email
from src.settings import get_settings

# Human-readable role labels shown in the invitation email (doc/emails are EN).
_ROLE_LABELS: dict[AccountUserRole, str] = {
    AccountUserRole.OWNER: "Owner",
    AccountUserRole.ADMINISTRATOR: "Administrator",
    AccountUserRole.PRODUCT_OWNER: "Product Owner",
    AccountUserRole.QA_MANAGER: "QA Manager",
    AccountUserRole.LEAD_DEVELOPER: "Lead Developer",
    AccountUserRole.DEVELOPER: "Developer",
    AccountUserRole.DATA_ANALYST: "Data Analyst",
    AccountUserRole.COMMENTATOR: "Commentator",
}


def _inviter_name(owner: User | None) -> str:
    if owner is None:
        return "Someone"
    full = " ".join(part for part in (owner.first_name, owner.last_name) if part).strip()
    return full or owner.email


class AccountInvitationsNotificationManager:
    def __init__(self):
        self._email = EmailService()

    def invitation_email(self, invitation: AccountUserInvitation, account: Account, owner: User | None) -> None:
        base = get_settings().app_url.rstrip("/")
        url = f"{base}/me/invitations?id={invitation.id}&token={invitation.token}"
        expire = invitation.expire_date.strftime("%Y-%m-%d") if invitation.expire_date else ""
        rendered = invitation_email(
            inviter=_inviter_name(owner),
            account_name=account.name,
            role=_ROLE_LABELS.get(invitation.role, invitation.role.value),
            action_url=url,
            expire_date=expire,
        )
        self._email.send(to=invitation.email, email=rendered)
