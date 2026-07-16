# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/usage` — the account's usage against its quotas.

Read-only aggregate powering the administration › Usage screen: for every
tracked entity type, the number of live records against a quota, grouped by
typology. Owners and administrators only.
"""

from typing import Annotated

from fastapi import APIRouter, Depends

from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse
from src.serializes.errors import ErrorResponse
from src.serializes.usage import UsageReport
from src.utils.dependencies import CurrentAccountDep, UsageManagerDep
from src.utils.middlewares import require_role

router = APIRouter(prefix="/accounts/{account_id}/usage", tags=["api.accounts.usage"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account not found"}}

_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


@router.get(
    "",
    operation_id="api.accounts.usage.get",
    summary="Get account usage",
    description=(
        "Return the account's usage: for every tracked entity type, the number of live "
        "records against its quota, grouped by typology (members, applications, databases, "
        "features, journeys, personas, services, content). File entities also report their "
        "cumulative storage against a storage quota. Owners and administrators only."
    ),
    response_model=ItemResponse[UsageReport],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_usage(
    account: CurrentAccountDep,
    _: Annotated[AccountUser, Depends(_ADMIN)],
    manager: UsageManagerDep,
) -> ItemResponse[UsageReport]:
    return ItemResponse(item=manager.report_for_account(account))
