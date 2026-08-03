# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/journeys/{journey_id}/complexities`.

List and give complexity estimates on a journey. Any account member may read and estimate.
"""

from fastapi import APIRouter, status

from src.forms.complexities import ComplexityUpsertForm
from src.models.enum import EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.complexities import ComplexityItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    ComplexityManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentJourneyDep,
)

router = APIRouter(prefix="/accounts/{account_id}/journeys/{journey_id}/complexities", tags=["api.journeys.complexities"])

_UNPROCESSABLE = {422: {"model": ErrorResponse, "description": "Value is not on the account's scale"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Journey not found"}}


@router.get(
    "",
    operation_id="api_journeys_complexities_list",
    summary="List journey complexity estimates",
    description="List the complexity estimates on a journey, oldest first. Any member may read.",
    response_model=ListingResponse[ComplexityItem],
    responses={**_NOT_FOUND},
)
def list_journey_complexities(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    journey: CurrentJourneyDep,
    manager: ComplexityManagerDep,
) -> ListingResponse[ComplexityItem]:
    rows = manager.list_for_entity(account, EntityType.JOURNEY, journey.id)
    return ListingResponse.single_page([ComplexityItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_journeys_complexities_create",
    summary="Estimate the complexity of a journey",
    description=(
        "Give or update your complexity estimate on a journey. Any member may estimate; "
        "a member holds at most one estimate per entity, so estimating again replaces it. "
        "The scale comes from the account's product complexity mode; a value outside it "
        "is refused."
    ),
    response_model=ItemResponse[ComplexityItem],
    responses={**_NOT_FOUND, **_UNPROCESSABLE},
)
def create_journey_complexity(
    form: ComplexityUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    journey: CurrentJourneyDep,
    manager: ComplexityManagerDep,
) -> ItemResponse[ComplexityItem]:
    complexity = manager.upsert(
        account, member, entity_type=EntityType.JOURNEY, entity_id=journey.id, value=form.value
    )
    return ItemResponse(item=ComplexityItem.model_validate(complexity))


@router.delete(
    "",
    operation_id="api_journeys_complexities_delete",
    summary="Withdraw your estimate on a journey",
    description=(
        "Withdraw your complexity estimate on a journey. Estimating `null` says \"I cannot "
        "estimate yet\" and keeps you among the participants; withdrawing removes you from them. "
        "404 when you have not estimated it."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_NOT_FOUND},
)
def delete_journey_complexity(
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    journey: CurrentJourneyDep,
    manager: ComplexityManagerDep,
) -> None:
    manager.remove(
        account, member, entity_type=EntityType.JOURNEY, entity_id=journey.id
    )
