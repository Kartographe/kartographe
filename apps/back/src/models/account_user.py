# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `account_user` table — a user's membership (seat) in an account.

Carries the member's `role`, which drives all account authorization. A partial
unique index enforces at most one *active* seat per (account, user); a seat that
is left keeps its row (`status=disabled`) for audit.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Index, text
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import AccountUserRole, AccountUserStatus, AccountUserType, VoteRole

if TYPE_CHECKING:
    from src.models.account import Account
    from src.models.account_user_invitation import AccountUserInvitation
    from src.models.user import User


class AccountUser(BaseModel, table=True):
    """A membership linking a user to an account with a role."""

    __tablename__ = "account_user"
    __table_args__ = (
        # At most one active membership per (account, user). Relies on the enum
        # column storing the *value* ("active"), per the SAEnum patch.
        Index(
            "unique_account_user_active",
            "account_id",
            "user_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )

    type: AccountUserType = Field(index=True)
    status: AccountUserStatus = Field(index=True)
    role: AccountUserRole = Field(index=True)
    # The standpoint this member votes from, snapshotted onto each vote they
    # cast. Independent of `role`; defaults to `other` and is editable by
    # owners/administrators.
    vote_role: VoteRole = Field(default=VoteRole.OTHER)

    date: datetime | None = Field(default=None)
    # Validity window of the seat; `end_date` is far in the future while active,
    # stamped to "now" when the member leaves.
    start_date: datetime | None = Field(default=None)
    end_date: datetime | None = Field(default=None)

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    account: "Account" = Relationship(back_populates="users")

    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    user: "User" = Relationship()

    # The invitation this seat was created from (null for the creator seat).
    account_user_invitation_id: uuid.UUID | None = Field(
        default=None, foreign_key="account_user_invitation.id", index=True
    )
    account_user_invitation: "AccountUserInvitation" = Relationship()
