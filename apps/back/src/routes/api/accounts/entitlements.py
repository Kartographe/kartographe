# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/entitlements` — the account's edition and features.

Read-only. Lets the frontend gate what it renders without hard-coding editions,
and lets an operator confirm what an install actually resolved to.

Open to any member, not just administrators: an ordinary member needs to know
whether a feature is available to them, and "which edition am I on" is not
sensitive. The ceilings behind those entitlements stay on the `usage` endpoint,
which is admin-only.
"""

from fastapi import APIRouter

from src.serializes._base import ItemResponse
from src.serializes.entitlements import EntitlementsItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import CurrentAccountUserDep, EntitlementsDep

router = APIRouter(prefix="/accounts/{account_id}/entitlements", tags=["api.accounts.entitlements"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "You are not a member of this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account not found"}}


@router.get(
    "",
    operation_id="api.accounts.entitlements.get",
    summary="Get account entitlements",
    description=(
        "Return what the account is entitled to: the edition it runs under and the "
        "licensed features unlocked for it. A self-hosted install with no licence "
        "reports the `community` edition and no features. Quotas are not repeated "
        "here — the usage endpoint reports each one next to the count it caps. "
        "Any member of the account may read this."
    ),
    response_model=ItemResponse[EntitlementsItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_entitlements(
    _: CurrentAccountUserDep,
    entitlements: EntitlementsDep,
) -> ItemResponse[EntitlementsItem]:
    return ItemResponse(
        item=EntitlementsItem(
            edition=entitlements.edition,
            features=sorted(feature.value for feature in entitlements.features),
        )
    )
