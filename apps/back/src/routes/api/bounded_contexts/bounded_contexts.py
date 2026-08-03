# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/bounded-contexts` — account-wide listing.

Any member may read the account's bounded contexts across every application.
Creating and editing one happens inside its application
(`.../applications/{application_id}/bounded-contexts`).
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from src.filters._base import MyVoteFilter, PageLimit, SortOrder
from src.filters.application_bounded_contexts import ApplicationBoundedContextSortField
from src.models.enum import EntityType
from src.serializes._base import ListingResponse
from src.serializes.application_bounded_contexts import (
    ApplicationBoundedContextListItem,
)
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    ApplicationBoundedContextManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
)

router = APIRouter(prefix="/accounts/{account_id}/bounded-contexts", tags=["api.boundedContexts"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account not found"}}


@router.get(
    "",
    operation_id="api_boundedContexts_list",
    summary="List bounded contexts",
    description=(
        "List the bounded contexts of the account across every application, most recent first. "
        "Restrict to given applications with `applicationIds`, keep only the contexts holding at "
        "least one of given components with `componentIds`, sort by date/title, and page through "
        "results. Each context carries its parent `applicationId` and `applicationTitle`. Any "
        "member may read."
    ),
    response_model=ListingResponse[ApplicationBoundedContextListItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_bounded_contexts(
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    manager: ApplicationBoundedContextManagerDep,
    application_ids: Annotated[list[uuid.UUID] | None, Query(alias="applicationIds")] = None,
    component_ids: Annotated[list[uuid.UUID] | None, Query(alias="componentIds")] = None,
    my_vote: MyVoteFilter = None,
    sort_by: Annotated[
        ApplicationBoundedContextSortField, Query(alias="sortBy")
    ] = ApplicationBoundedContextSortField.DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[PageLimit, Query()] = PageLimit.L25,
) -> ListingResponse[ApplicationBoundedContextListItem]:
    rows, total, titles = manager.list_for_account(
        account,
        application_ids=application_ids,
        component_ids=component_ids,
        my_vote=my_vote,
        user_id=member.user_id,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit.value,
    )
    items = [
        ApplicationBoundedContextListItem.model_validate(row).model_copy(
            update={"application_title": titles.get(row.application_id)}
        )
        for row in rows
    ]
    manager.enrich(EntityType.APPLICATION_BOUNDED_CONTEXT, items, user_id=member.user_id)
    return ListingResponse.paginate(items, count=total, page=page, limit=limit.value)
