# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/search` — full-text search over an account.

Postgres-native search across the account's indexed entities (features,
journeys, scenarios, steps, personas, databases, tables, columns, migrations,
services, actions, applications, routes) and their comments. Any member may
search; results carry a `resource` breadcrumb the front deep-links to.
"""

from typing import Annotated

from fastapi import APIRouter, Query

from src.models.enum import SearchEntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.errors import ErrorResponse
from src.serializes.search import SearchCountsItem, SearchResultItem
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    SearchManagerDep,
)

router = APIRouter(prefix="/accounts/{account_id}/search", tags=["api.accounts.search"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account not found"}}

SearchMode = Annotated[
    str,
    Query(
        pattern="^(simple|expert)$",
        description="`simple` treats each word as a prefix (as-you-type); `expert` passes raw tsquery syntax.",
    ),
]


@router.get(
    "",
    operation_id="api_accounts_search",
    summary="Search an account",
    description=(
        "Full-text search across the account's entities and comments, most relevant first. "
        "Pass the query as `q`; optionally restrict to one or more `entityType` (repeat the query "
        "param). Each hit carries its kind (`entityType`/`entityId`), a relevance `score`, a `label`, "
        "an `excerpt` (comment hits only), and a `resource` — the navigable target entity with its "
        "containing entities in `resource.parents` (for a comment, the commented entity). Any member "
        "may search."
    ),
    response_model=ListingResponse[SearchResultItem],
    responses={**_NOT_FOUND},
)
def search_account(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: SearchManagerDep,
    q: Annotated[str, Query(min_length=1, description="The text to search for.")],
    entity_type: Annotated[list[SearchEntityType] | None, Query(alias="entityType")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    mode: SearchMode = "simple",
) -> ListingResponse[SearchResultItem]:
    scored_rows, count = manager.search(
        account, q, entity_types=entity_type, page=page, limit=limit, mode=mode
    )
    items = manager.resolve_results(account, scored_rows)
    return ListingResponse.paginate(items, count=count, page=page, limit=limit)


@router.get(
    "/counts",
    operation_id="api_accounts_search_counts",
    summary="Search result counts by type",
    description=(
        "Return the number of matches per entity type for a query `q` (plus the `total`), so the "
        "front can render result facets. Any member may search."
    ),
    response_model=ItemResponse[SearchCountsItem],
    responses={**_NOT_FOUND},
)
def search_account_counts(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: SearchManagerDep,
    q: Annotated[str, Query(min_length=1, description="The text to search for.")],
    mode: SearchMode = "simple",
) -> ItemResponse[SearchCountsItem]:
    counts = manager.counts(account, q, mode=mode)
    return ItemResponse(item=SearchCountsItem(counts=counts, total=sum(counts.values())))
