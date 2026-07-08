"""Account lifecycle + membership resolution.

Business logic for creating a workspace, listing the ones a user belongs to,
and resolving the effective membership behind a request. Guards that mutate
members/invitations live in the sibling managers.
"""

import uuid

from fastapi import HTTPException, UploadFile, status
from sqlmodel import Session, func, select

from src.filters.accounts import AccountSortField
from src.filters._base import SortOrder
from src.managers.files import FileManager
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
from src.serializes.accounts import AccountItem, AccountUserContextItem
from src.utils.datetime import FAR_FUTURE, utc_now

# Roles allowed to manage the account (settings, members, invitations).
PRIVILEGED_ROLES = frozenset({AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR})

# Account logos are normalised to a square of this side (px) before storage.
_ACCOUNT_PICTURE_SIZE = 512

_SORT_COLUMNS = {
    AccountSortField.NAME: Account.name,
    AccountSortField.CREATED_DATE: Account.created_date,
    AccountSortField.STATUS: Account.status,
    AccountSortField.ROLE: AccountUser.role,
}


class AccountManager:
    def __init__(self, session: Session):
        self.session = session
        self._files = FileManager()

    def to_item(self, account: Account, membership: AccountUser | None = None) -> AccountItem:
        return AccountItem(
            id=account.id,
            name=account.name,
            status=account.status,
            language=account.language,
            time_zone=account.time_zone,
            picture_profile=self._files.public_url_for(account.picture_profile),
            created_date=account.created_date,
            status_date=account.status_date,
            membership=(
                AccountUserContextItem.model_validate(membership) if membership is not None else None
            ),
        )

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

    def list_for_user(
        self,
        user: User,
        *,
        statuses: list[AccountStatus] | None = None,
        roles: list[AccountUserRole] | None = None,
        sort_by: AccountSortField = AccountSortField.CREATED_DATE,
        sort_order: SortOrder = SortOrder.DESC,
        page: int = 1,
        limit: int = 25,
    ) -> tuple[list[tuple[AccountUser, Account]], int]:
        """One page of the user's active memberships joined to their accounts.

        Returns `(rows, total)` — `total` is the unpaginated match count.
        Filters on account status and membership role (multi-value); sorts on
        name / created_date / status / role."""
        now = utc_now()
        conditions = [
            AccountUser.user_id == user.id,
            AccountUser.status == AccountUserStatus.ACTIVE,
            AccountUser.enabled.is_(True),
            AccountUser.start_date <= now,
            AccountUser.end_date > now,
            Account.enabled.is_(True),
        ]
        if statuses:
            conditions.append(Account.status.in_(statuses))
        if roles:
            conditions.append(AccountUser.role.in_(roles))

        base = select(AccountUser, Account).join(Account, Account.id == AccountUser.account_id).where(*conditions)

        total = self.session.exec(
            select(func.count()).select_from(base.subquery())
        ).one()

        column = _SORT_COLUMNS[sort_by]
        ordering = column.asc() if sort_order == SortOrder.ASC else column.desc()
        rows = self.session.exec(
            base.order_by(ordering).offset((page - 1) * limit).limit(limit)
        ).all()
        return list(rows), total

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

    def set_picture(self, account: Account, file: UploadFile) -> Account:
        """Store a square-cropped logo and replace the previous one."""
        previous_key = account.picture_profile
        key = self._files.save_image(
            file, prefix=f"accounts/{account.id}/profile", square_size=_ACCOUNT_PICTURE_SIZE
        )
        account.picture_profile = key
        account.updated_at = utc_now()
        self.session.add(account)
        self.session.commit()
        self.session.refresh(account)
        if previous_key and previous_key != key:
            self._files.delete(previous_key)
        return account
