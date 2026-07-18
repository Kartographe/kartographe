# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/stats` — dashboard statistics for the account.

Read-only aggregate powering the account dashboard: for every tracked entity
type, its all-time count, how many were created in the selected period, the
delta against the preceding sliding window, and a per-bucket sparkline series.
Any member may read.
"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Query

from src.serializes._base import ItemResponse
from src.serializes.errors import ErrorResponse
from src.serializes.stats import StatsReport
from src.utils.dependencies import CurrentAccountDep, CurrentAccountUserDep, StatsManagerDep

router = APIRouter(prefix="/accounts/{account_id}/stats", tags=["api.accounts.stats"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account not found"}}


@router.get(
    "",
    operation_id="api_accounts_stats_get",
    summary="Get account statistics",
    description=(
        "Return the account's dashboard statistics. For every tracked entity type (features, "
        "journeys, scenarios, personas, applications, databases, services, routes, comments, "
        "votes) it reports the all-time live count (`total`), how many were created in the "
        "selected period (`periodCount`), how many in the preceding window of equal length "
        "(`previousCount`), the relative change between the two (`delta`, null when there is no "
        "baseline), and a per-bucket `series` for a sparkline. Restrict the period with `lbound` "
        "/ `ubound` (inclusive bounds on the entity's date, ISO-8601); both default sensibly to "
        "the last 30 days. Buckets are daily for short periods, weekly beyond a month. Any "
        "member may read."
    ),
    response_model=ItemResponse[StatsReport],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_stats(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: StatsManagerDep,
    lbound: Annotated[datetime | None, Query()] = None,
    ubound: Annotated[datetime | None, Query()] = None,
) -> ItemResponse[StatsReport]:
    return ItemResponse(item=manager.report_for_account(account, lbound=lbound, ubound=ubound))
