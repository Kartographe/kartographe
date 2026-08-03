# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/me` — the caller's own seat in an account.

Everything here is scoped to `CurrentAccountUserDep`, i.e. the membership the
access token resolves to: a member can read and write their own seat's UI
preferences and nothing else. There is no way to reach another member's
preferences from these routes.
"""

from fastapi import APIRouter, status

from src.forms.account_users import AccountUserPreferenceForm
from src.serializes._base import ItemResponse
from src.serializes.account_users import AccountUserMeItem, AccountUserPreferencesItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import AccountUsersManagerDep, CurrentAccountUserDep

router = APIRouter(prefix="/accounts/{account_id}/me", tags=["api.accounts.me"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "You are not a member of this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account not found"}}


@router.get(
    "",
    operation_id="api_accounts_me_get",
    summary="Get the caller's own membership",
    description=(
        "Return the signed-in user's seat on this account — role, voting role, status "
        "and their stored UI preferences for this account."
    ),
    response_model=ItemResponse[AccountUserMeItem],
    status_code=status.HTTP_200_OK,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_me(membership: CurrentAccountUserDep) -> ItemResponse[AccountUserMeItem]:
    return ItemResponse(item=AccountUserMeItem.model_validate(membership))


@router.post(
    "/preferences",
    operation_id="api_accounts_me_preferences_set",
    summary="Set one of the caller's preferences",
    description=(
        "Store a single `key`/`value` pair in the caller's preference map for this "
        "account, leaving the other keys untouched. `value` may be any JSON value — "
        "the API stores it verbatim. Used by the front to remember per-page view "
        "state (filters, sort, pagination). Returns the whole updated map."
    ),
    response_model=ItemResponse[AccountUserPreferencesItem],
    status_code=status.HTTP_200_OK,
    responses={
        **_FORBIDDEN,
        **_NOT_FOUND,
        413: {"model": ErrorResponse, "description": "Preferences are too large"},
    },
)
def set_preference(
    form: AccountUserPreferenceForm,
    membership: CurrentAccountUserDep,
    manager: AccountUsersManagerDep,
) -> ItemResponse[AccountUserPreferencesItem]:
    preferences = manager.set_preference(membership, form.key, form.value)
    return ItemResponse(item=AccountUserPreferencesItem(preferences=preferences))
