# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Member (seat) management, with all the authorization guards.

Every mutation defends the same invariants: a member cannot act on their own
seat, only an owner may grant the owner role, and an account must always keep at
least one active owner.
"""

from fastapi import HTTPException, status
from sqlmodel import Session, select

from src.models.account import Account
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, AccountUserStatus, VoteRole
from src.models.user import User
from src.utils.datetime import utc_now

# How an account role maps onto a default voting role. Privileged/read-only
# roles (owner, administrator, commentator) carry no domain standpoint, so they
# fall back to `other`; the rest map onto their matching voting hat.
_VOTE_ROLE_FOR_ACCOUNT_ROLE: dict[AccountUserRole, VoteRole] = {
    AccountUserRole.PRODUCT_OWNER: VoteRole.PRODUCT_OWNER,
    AccountUserRole.QA_MANAGER: VoteRole.QA,
    AccountUserRole.LEAD_DEVELOPER: VoteRole.DEVELOPER,
    AccountUserRole.DEVELOPER: VoteRole.DEVELOPER,
    AccountUserRole.DATA_ANALYST: VoteRole.DATA_ANALYST,
}


def vote_role_for_account_role(role: AccountUserRole) -> VoteRole:
    """The voting role a member gets by default from their account role."""
    return _VOTE_ROLE_FOR_ACCOUNT_ROLE.get(role, VoteRole.OTHER)


class AccountUsersManager:
    def __init__(self, session: Session):
        self.session = session

    def list_for_account(self, account: Account) -> list[tuple[AccountUser, User]]:
        """All enabled seats of the account joined to their users, oldest first."""
        return list(
            self.session.exec(
                select(AccountUser, User)
                .join(User, User.id == AccountUser.user_id)
                .where(
                    AccountUser.account_id == account.id,
                    AccountUser.enabled.is_(True),
                )
                .order_by(AccountUser.start_date.asc())
            ).all()
        )

    # --- guards ----------------------------------------------------------

    def _forbid_self_target(self, target: AccountUser, caller: AccountUser) -> None:
        if target.id == caller.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot act on your own membership.")

    def _assert_other_active_owner_exists(self, target: AccountUser) -> None:
        """Refuse to demote/remove the last active owner of the account."""
        if target.role != AccountUserRole.OWNER:
            return
        other_owner = self.session.exec(
            select(AccountUser).where(
                AccountUser.account_id == target.account_id,
                AccountUser.id != target.id,
                AccountUser.role == AccountUserRole.OWNER,
                AccountUser.status == AccountUserStatus.ACTIVE,
                AccountUser.enabled.is_(True),
            )
        ).first()
        if other_owner is None:
            raise HTTPException(status.HTTP_409_CONFLICT, "The account must keep at least one owner.")

    # --- mutations -------------------------------------------------------

    def update_role(self, target: AccountUser, new_role: AccountUserRole, *, caller: AccountUser) -> AccountUser:
        """Change a member's role. Only an owner may grant the owner role, and
        demoting the last owner is refused."""
        self._forbid_self_target(target, caller)
        if new_role == AccountUserRole.OWNER and caller.role != AccountUserRole.OWNER:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only an owner can grant the owner role.")
        if target.role == new_role:
            return target
        if target.role == AccountUserRole.OWNER:
            self._assert_other_active_owner_exists(target)
        target.role = new_role
        target.updated_at = utc_now()
        self.session.add(target)
        self.session.commit()
        self.session.refresh(target)
        return target

    def update_vote_role(self, target: AccountUser, new_vote_role: VoteRole) -> AccountUser:
        """Change a member's voting role. Owners/administrators only (enforced at
        the route). Carries no account-role invariants, so self-editing is fine."""
        if target.vote_role == new_vote_role:
            return target
        target.vote_role = new_vote_role
        target.updated_at = utc_now()
        self.session.add(target)
        self.session.commit()
        self.session.refresh(target)
        return target

    def soft_delete(self, target: AccountUser, *, caller: AccountUser) -> None:
        """Hard-remove a member's seat (soft-delete row), keeping owners safe."""
        self._forbid_self_target(target, caller)
        self._assert_other_active_owner_exists(target)
        now = utc_now()
        target.enabled = False
        target.deleted_at = now
        target.updated_at = now
        self.session.add(target)
        self.session.commit()

    def leave(self, member: AccountUser) -> None:
        """Self-leave: deactivate the seat but keep the row for audit."""
        self._assert_other_active_owner_exists(member)
        now = utc_now()
        member.status = AccountUserStatus.DISABLED
        member.end_date = now
        member.updated_at = now
        self.session.add(member)
        self.session.commit()

    def leave_member(self, target: AccountUser, *, caller: AccountUser) -> None:
        """Admin forces a member out (deactivate their seat)."""
        self._forbid_self_target(target, caller)
        self.leave(target)
