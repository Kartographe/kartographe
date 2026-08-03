# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/components` — account-wide component listing.

Any member may read the account's components across every application. Creating
and editing a component happens inside its application
(`.../applications/{application_id}/components`).
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from src.filters._base import MyComplexityFilter, MyVoteFilter, PageLimit, SortOrder
from src.filters.application_components import ApplicationComponentSortField
from src.models.enum import (
    ApplicationComponentStatus,
    ApplicationComponentType,
    EntityType,
)
from src.serializes._base import ListingResponse
from src.serializes.application_components import ApplicationComponentListItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    ApplicationComponentManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    TagManagerDep,
)

router = APIRouter(prefix="/accounts/{account_id}/components", tags=["api.components"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account not found"}}


@router.get(
    "",
    operation_id="api_components_list",
    summary="List components",
    description=(
        "List the components of the account across every application, most recent first. Filter "
        "by status and/or type (repeat the query param for multiple values), restrict to given "
        "applications with `applicationIds`, sort by date/title/status/type, and page through "
        "results. Filter with `tagIds` (repeat the query param) to keep only the components "
        "carrying at least one of those tags. Each component carries its parent `applicationId` "
        "and `applicationTitle`. Any member may read."
    ),
    response_model=ListingResponse[ApplicationComponentListItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_components(
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    manager: ApplicationComponentManagerDep,
    tags: TagManagerDep,
    component_status: Annotated[list[ApplicationComponentStatus] | None, Query(alias="status")] = None,
    type: Annotated[list[ApplicationComponentType] | None, Query(alias="type")] = None,
    application_ids: Annotated[list[uuid.UUID] | None, Query(alias="applicationIds")] = None,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
    my_vote: MyVoteFilter = None,
    my_complexity: MyComplexityFilter = None,
    sort_by: Annotated[
        ApplicationComponentSortField, Query(alias="sortBy")
    ] = ApplicationComponentSortField.DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[PageLimit, Query()] = PageLimit.L25,
) -> ListingResponse[ApplicationComponentListItem]:
    rows, total, titles = manager.list_for_account(
        account,
        statuses=component_status,
        types=type,
        application_ids=application_ids,
        tag_ids=tag_ids,
        my_vote=my_vote,
        my_complexity=my_complexity,
        user_id=member.user_id,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit.value,
    )
    items = [
        item.model_copy(update={"application_title": titles.get(item.application_id)})
        for item in tags.attach(rows, ApplicationComponentListItem)
    ]
    manager.enrich(EntityType.APPLICATION_COMPONENT, items, user_id=member.user_id)
    return ListingResponse.paginate(items, count=total, page=page, limit=limit.value)
