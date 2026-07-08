"""Account lifecycle + membership resolution.

Business logic for creating a workspace, listing the ones a user belongs to,
and resolving the effective membership behind a request. Guards that mutate
members/invitations live in the sibling managers.
"""

import uuid

from fastapi import HTTPException, status
from sqlmodel import Session, select

from src.models.account import Account
from src.models.account_user import AccountUser
from src.models.enum import (
    AccountStatus,
    AccountUserRole,
    AccountUserStatus,
    AccountUserType,
    Language,
)
from src.models.user import User
from src.utils.datetime import FAR_FUTURE, utc_now

# Roles allowed to manage the account (settings, members, invitations).
PRIVILEGED_ROLES = frozenset({AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR})


class AccountManager:
    def __init__(self, session: Session):
        self.session = session

    def find_active_account_user(self, *, user_id: uuid.UUID, account_id: uuid.UUID) -> AccountUser | None:
        """The user's active seat in the account, if any (time-window aware)."""
        now = utc_now()
        return self.session.exec(
            select(AccountUser)
            .where(
                AccountUser.account_id == account_id,
                AccountUser.user_id == user_id,
                AccountUser.status == AccountUserStatus.ACTIVE,
                AccountUser.enabled.is_(True),
                AccountUser.start_date <= now,
                AccountUser.end_date > now,
            )
            .order_by(AccountUser.start_date.desc())
        ).first()

    def resolve_account_user(self, *, user_id: uuid.UUID, account: Account) -> AccountUser | None:
        """Effective membership behind a request (flat model: direct seat only)."""
        return self.find_active_account_user(user_id=user_id, account_id=account.id)

    def list_for_user(self, user: User, *, role: AccountUserRole | None = None) -> list[tuple[AccountUser, Account]]:
        """Active memberships of the user, joined to their accounts, newest first."""
        now = utc_now()
        query = (
            select(AccountUser, Account)
            .join(Account, Account.id == AccountUser.account_id)
            .where(
                AccountUser.user_id == user.id,
                AccountUser.status == AccountUserStatus.ACTIVE,
                AccountUser.enabled.is_(True),
                AccountUser.start_date <= now,
                AccountUser.end_date > now,
                Account.enabled.is_(True),
            )
            .order_by(AccountUser.start_date.desc())
        )
        if role is not None:
            query = query.where(AccountUser.role == role)
        return list(self.session.exec(query).all())

    def create_account(
        self, user: User, *, name: str, language: Language, time_zone: str
    ) -> tuple[Account, AccountUser]:
        """Create a workspace; the creator becomes its (only) active owner."""
        now = utc_now()
        account = Account(
            status=AccountStatus.ACTIVE,
            language=language,
            name=name,
            time_zone=time_zone,
            created_date=now,
            status_date=now,
        )
        self.session.add(account)
        self.session.flush()  # assign account.id before the seat references it

        account_user = AccountUser(
            type=AccountUserType.CREATOR,
            status=AccountUserStatus.ACTIVE,
            role=AccountUserRole.OWNER,
            date=now,
            start_date=now,
            end_date=FAR_FUTURE,
            account_id=account.id,
            user_id=user.id,
        )
        self.session.add(account_user)
        self.session.commit()
        self.session.refresh(account)
        self.session.refresh(account_user)
        return account, account_user

    def update(self, account: Account, fields: dict) -> Account:
        """Apply a partial update (already-validated, snake_case keys)."""
        for key, value in fields.items():
            setattr(account, key, value)
        account.updated_at = utc_now()
        self.session.add(account)
        self.session.commit()
        self.session.refresh(account)
        return account

    def set_status(self, account: Account, new_status: AccountStatus) -> Account:
        """Flip the account status (activate / deactivate), stamping the moment."""
        if account.status != new_status:
            account.status = new_status
            account.status_date = utc_now()
            account.updated_at = utc_now()
            self.session.add(account)
            self.session.commit()
            self.session.refresh(account)
        return account

    def soft_delete(self, account: Account) -> None:
        """Soft-delete a *disabled* account (guard: must be deactivated first)."""
        if account.status != AccountStatus.DISABLED:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "The account must be deactivated before it can be deleted.",
            )
        now = utc_now()
        account.enabled = False
        account.deleted_at = now
        account.updated_at = now
        self.session.add(account)
        self.session.commit()
