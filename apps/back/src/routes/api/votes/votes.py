# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/votes` — account-wide vote listing & casting.

Any member may read the account's votes and cast one on any entity through the
mutualized `POST` (the target is a `(entityType, entityId)` pair, validated
against the account); the per-entity endpoints (`.../{entity}/votes`) remain.
"""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from src.filters._base import SortOrder
from src.filters.votes import VoteSortField
from src.forms.votes import VoteCastForm
from src.models.enum import EntityType, VoteRole, VoteValue
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.errors import ErrorResponse
from src.serializes.votes import VoteItem, VoteListItem
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    VoteManagerDep,
)

router = APIRouter(prefix="/accounts/{account_id}/votes", tags=["api.votes"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account or entity not found"}}


@router.get(
    "",
    operation_id="api_votes_list",
    summary="List votes",
    description=(
        "List the votes of the account, most recent first. Filter by entity type, entity id, "
        "owner, role and/or value (repeat the query param for multiple values), restrict to a "
        "date range with `lbound` / `ubound` (inclusive bounds on the vote's date, ISO-8601), "
        "and sort by date/value/role. Each vote carries its resolved `entity` — the voted "
        "entity's type, id and label, with its containing entities in `parents` (null when the "
        "entity has since been deleted). Any member may read."
    ),
    response_model=ListingResponse[VoteListItem],
    responses={**_NOT_FOUND},
)
def list_votes(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: VoteManagerDep,
    entity_type: Annotated[list[EntityType] | None, Query(alias="entityType")] = None,
    entity_id: Annotated[list[uuid.UUID] | None, Query(alias="entityId")] = None,
    owner_id: Annotated[list[uuid.UUID] | None, Query(alias="ownerId")] = None,
    role: Annotated[list[VoteRole] | None, Query(alias="role")] = None,
    value: Annotated[list[VoteValue] | None, Query(alias="value")] = None,
    lbound: Annotated[datetime | None, Query()] = None,
    ubound: Annotated[datetime | None, Query()] = None,
    sort_by: Annotated[VoteSortField, Query(alias="sortBy")] = VoteSortField.DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
) -> ListingResponse[VoteListItem]:
    rows = manager.list_for_account(
        account,
        entity_types=entity_type,
        entity_ids=entity_id,
        owner_ids=owner_id,
        roles=role,
        values=value,
        lbound=lbound,
        ubound=ubound,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    entities = manager.resolve_entities(account, rows)
    items = [
        VoteListItem.model_validate(row).model_copy(
            update={"entity": entities.get((row.entity_type, row.entity_id))}
        )
        for row in rows
    ]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_votes_create",
    summary="Cast a vote",
    description=(
        "Cast or update your vote on any entity of the account, given its `entityType` and "
        "`entityId`. A member holds at most one vote per entity, so voting again replaces it; "
        "the vote's role is taken from your voting role. Any member may vote. The mutualized "
        "counterpart of the per-entity `.../{entity}/votes` endpoints."
    ),
    response_model=ItemResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def cast_vote(
    form: VoteCastForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    manager: VoteManagerDep,
) -> ItemResponse[VoteItem]:
    if not manager.entity_exists(account, form.entity_type, form.entity_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entity not found.")
    vote = manager.upsert(
        account, member, entity_type=form.entity_type, entity_id=form.entity_id, value=form.value
    )
    return ItemResponse(item=VoteItem.model_validate(vote))
