# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/scenarios` — account-wide scenario listing.

Any member may read the account's scenarios across every journey. Creating and
editing a scenario happens inside its journey (`.../journeys/{journey_id}/scenarios`).
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from src.filters._base import PageLimit, SortOrder
from src.filters.journey_scenarios import JourneyScenarioSortField
from src.models.enum import JourneyScenarioCriticity, JourneyScenarioStatus, JourneyScenarioType
from src.serializes._base import ListingResponse
from src.serializes.errors import ErrorResponse
from src.serializes.journeys import JourneyScenarioListItem
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    JourneyScenarioManagerDep,
    TagManagerDep,
)

router = APIRouter(prefix="/accounts/{account_id}/scenarios", tags=["api.scenarios"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account not found"}}


@router.get(
    "",
    operation_id="api_scenarios_list",
    summary="List scenarios",
    description=(
        "List the scenarios of the account across every journey, most recent first. Filter by "
        "status, type and/or criticity (repeat the query param for multiple values), sort by "
        "date/title/status/type/criticity, and page through results. Filter with `tagIds` (repeat "
        "the query param) to keep only the scenarios carrying at least one of those tags, and with "
        "`personasIds` to keep only those targeting at least one of those personas. Each scenario "
        "carries its parent `journeyId` and `journeyTitle`. Any member may read."
    ),
    response_model=ListingResponse[JourneyScenarioListItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_scenarios(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: JourneyScenarioManagerDep,
    tags: TagManagerDep,
    scenario_status: Annotated[list[JourneyScenarioStatus] | None, Query(alias="status")] = None,
    type: Annotated[list[JourneyScenarioType] | None, Query(alias="type")] = None,
    criticity: Annotated[list[JourneyScenarioCriticity] | None, Query(alias="criticity")] = None,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
    persona_ids: Annotated[list[uuid.UUID] | None, Query(alias="personasIds")] = None,
    sort_by: Annotated[JourneyScenarioSortField, Query(alias="sortBy")] = JourneyScenarioSortField.DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[PageLimit, Query()] = PageLimit.L25,
) -> ListingResponse[JourneyScenarioListItem]:
    rows, total, titles = manager.list_for_account(
        account,
        statuses=scenario_status,
        types=type,
        criticities=criticity,
        tag_ids=tag_ids,
        persona_ids=persona_ids,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit.value,
    )
    items = [
        item.model_copy(update={"journey_title": titles.get(item.journey_id)})
        for item in tags.attach(rows, JourneyScenarioListItem)
    ]
    return ListingResponse.paginate(items, count=total, page=page, limit=limit.value)
