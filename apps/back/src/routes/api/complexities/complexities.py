# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/complexities` — account-wide complexity listing,
scales and estimating.

Any member may read the account's estimates and give one on any entity through
the mutualized `POST` (the target is a `(entityType, entityId)` pair, validated
against the account); the per-entity endpoints (`.../{entity}/complexities`)
remain.
"""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from src.filters._base import SortOrder
from src.filters.complexities import ComplexitySortField
from src.forms.complexities import ComplexityCastForm
from src.models.enum import ComplexityMode, EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.complexities import (
    ComplexityItem,
    ComplexityListItem,
    ComplexityScaleItem,
)
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    ComplexityManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
)

router = APIRouter(prefix="/accounts/{account_id}/complexities", tags=["api.complexities"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account or entity not found"}}
_UNPROCESSABLE = {422: {"model": ErrorResponse, "description": "Value is not on the account's scale"}}


@router.get(
    "",
    operation_id="api_complexities_list",
    summary="List complexity estimates",
    description=(
        "List the complexity estimates of the account, most recent first. Filter by entity "
        "type, entity id, owner and/or mode (repeat the query param for multiple values), "
        "restrict to a date range with `lbound` / `ubound` (inclusive bounds on the estimate's "
        "date, ISO-8601), and sort by date/value/mode. Each estimate carries its resolved "
        "`entity` — the estimated entity's type, id and label, with its containing entities in "
        "`parents` (null when the entity has since been deleted). Any member may read."
    ),
    response_model=ListingResponse[ComplexityListItem],
    responses={**_NOT_FOUND},
)
def list_complexities(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: ComplexityManagerDep,
    entity_type: Annotated[list[EntityType] | None, Query(alias="entityType")] = None,
    entity_id: Annotated[list[uuid.UUID] | None, Query(alias="entityId")] = None,
    owner_id: Annotated[list[uuid.UUID] | None, Query(alias="ownerId")] = None,
    mode: Annotated[list[ComplexityMode] | None, Query(alias="mode")] = None,
    lbound: Annotated[datetime | None, Query()] = None,
    ubound: Annotated[datetime | None, Query()] = None,
    sort_by: Annotated[ComplexitySortField, Query(alias="sortBy")] = ComplexitySortField.DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
) -> ListingResponse[ComplexityListItem]:
    rows = manager.list_for_account(
        account,
        entity_types=entity_type,
        entity_ids=entity_id,
        owner_ids=owner_id,
        modes=mode,
        lbound=lbound,
        ubound=ubound,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    entities = manager.resolve_entities(account, rows)
    items = [
        ComplexityListItem.model_validate(row).model_copy(
            update={"entity": entities.get((row.entity_type, row.entity_id))}
        )
        for row in rows
    ]
    return ListingResponse.single_page(items)


@router.get(
    "/scales",
    operation_id="api_complexities_scales_list",
    summary="List the account's complexity scales",
    description=(
        "The two scales the account estimates on — technical (applications, routes, databases, "
        "services) and product (features, personas, journeys) — with the mode set on the account "
        "and the values it accepts, ascending. `null` is accepted on top of them and means "
        '"cannot estimate yet". Any member may read.'
    ),
    response_model=ListingResponse[ComplexityScaleItem],
    responses={**_NOT_FOUND},
)
def list_complexity_scales(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: ComplexityManagerDep,
) -> ListingResponse[ComplexityScaleItem]:
    items = [
        ComplexityScaleItem(scope=scope, mode=mode, values=values)
        for scope, mode, values in manager.scales(account)
    ]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_complexities_create",
    summary="Estimate an entity's complexity",
    description=(
        "Give or update your complexity estimate on any entity of the account, given its "
        "`entityType` and `entityId`. A member holds at most one estimate per entity, so "
        "estimating again replaces it. The scale is not chosen by the client: it comes from the "
        "account's technical or product mode, picked by the entity's kind, and a value outside "
        "that scale is refused. Any member may estimate. The mutualized counterpart of the "
        "per-entity `.../{entity}/complexities` endpoints."
    ),
    response_model=ItemResponse[ComplexityItem],
    responses={**_NOT_FOUND, **_UNPROCESSABLE},
)
def create_complexity(
    form: ComplexityCastForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    manager: ComplexityManagerDep,
) -> ItemResponse[ComplexityItem]:
    if not manager.entity_exists(account, form.entity_type, form.entity_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entity not found.")
    complexity = manager.upsert(
        account,
        member,
        entity_type=form.entity_type,
        entity_id=form.entity_id,
        value=form.value,
    )
    return ItemResponse(item=ComplexityItem.model_validate(complexity))


@router.delete(
    "",
    operation_id="api_complexities_delete",
    summary="Withdraw your estimate",
    description=(
        "Withdraw your complexity estimate on any entity of the account, given its `entityType` "
        "and `entityId`. Withdrawing is not the same as estimating `null`: `null` says \"I cannot "
        "estimate yet\" and keeps you among the participants, withdrawing removes you from them. "
        "404 when you have not estimated the entity. The mutualized counterpart of the per-entity "
        "`.../{entity}/complexities` endpoints."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_NOT_FOUND},
)
def delete_complexity(
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    manager: ComplexityManagerDep,
    entity_type: Annotated[EntityType, Query(alias="entityType")],
    entity_id: Annotated[uuid.UUID, Query(alias="entityId")],
) -> None:
    manager.remove(account, member, entity_type=entity_type, entity_id=entity_id)
