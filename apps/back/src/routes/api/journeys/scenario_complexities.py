# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/complexities`.

List and give complexity estimates on a journey scenario. Any account member may read and estimate.
"""

from fastapi import APIRouter

from src.forms.complexities import ComplexityUpsertForm
from src.models.enum import EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.complexities import ComplexityItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    ComplexityManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentJourneyScenarioDep,
)

router = APIRouter(prefix="/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/complexities", tags=["api.journeys.scenarios.complexities"])

_UNPROCESSABLE = {422: {"model": ErrorResponse, "description": "Value is not on the account's scale"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Journey or scenario not found"}}


@router.get(
    "",
    operation_id="api_journeys_scenarios_complexities_list",
    summary="List scenario complexity estimates",
    description="List the complexity estimates on a journey scenario, oldest first. Any member may read.",
    response_model=ListingResponse[ComplexityItem],
    responses={**_NOT_FOUND},
)
def list_scenario_complexities(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    scenario: CurrentJourneyScenarioDep,
    manager: ComplexityManagerDep,
) -> ListingResponse[ComplexityItem]:
    rows = manager.list_for_entity(account, EntityType.JOURNEY_SCENARIO, scenario.id)
    return ListingResponse.single_page([ComplexityItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_journeys_scenarios_complexities_create",
    summary="Estimate the complexity of a scenario",
    description=(
        "Give or update your complexity estimate on a journey scenario. Any member may estimate; "
        "a member holds at most one estimate per entity, so estimating again replaces it. "
        "The scale comes from the account's product complexity mode; a value outside it "
        "is refused."
    ),
    response_model=ItemResponse[ComplexityItem],
    responses={**_NOT_FOUND, **_UNPROCESSABLE},
)
def create_scenario_complexity(
    form: ComplexityUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    scenario: CurrentJourneyScenarioDep,
    manager: ComplexityManagerDep,
) -> ItemResponse[ComplexityItem]:
    complexity = manager.upsert(
        account, member, entity_type=EntityType.JOURNEY_SCENARIO, entity_id=scenario.id, value=form.value
    )
    return ItemResponse(item=ComplexityItem.model_validate(complexity))
