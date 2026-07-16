# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `account_user_invitation` table — a pending seat offered to an email.

On acceptance, the recipient (matched by email) gets an `AccountUser` seat
referencing this invitation. A partial unique index enforces one *standby*
invitation per (account, email). Carries an opaque `token` used to deep-link the
recipient to the invitation, and a 7-day `expire_date`.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Index, text
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import AccountUserInvitationStatus, AccountUserInvitationType, AccountUserRole

if TYPE_CHECKING:
    from src.models.account import Account
    from src.models.user import User


class AccountUserInvitation(BaseModel, table=True):
    """A pending invitation to join an account with a given role."""

    __tablename__ = "account_user_invitation"
    __table_args__ = (
        # One pending (standby) invitation per (account, email).
        Index(
            "unique_account_email_invitation_standby",
            "account_id",
            "email",
            unique=True,
            postgresql_where=text("status = 'standby'"),
        ),
    )

    type: AccountUserInvitationType = Field(default=AccountUserInvitationType.SIMPLE, index=True)
    status: AccountUserInvitationStatus = Field(index=True)
    # Reuses the membership role enum — you invite someone *as* one of these.
    role: AccountUserRole = Field(index=True)

    date: datetime | None = Field(default=None)
    status_date: datetime | None = Field(default=None)
    expire_date: datetime | None = Field(default=None)

    email: str = Field(index=True)
    token: str = Field(index=True)

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    account: "Account" = Relationship(back_populates="invitations")

    # The member who sent the invitation.
    owner_id: uuid.UUID | None = Field(default=None, foreign_key="user.id", index=True)
    owner: "User" = Relationship()
