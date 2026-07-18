# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/votes`.

List and cast votes on a journey scenario. Any account member may read and vote.
"""

from fastapi import APIRouter

from src.forms.votes import VoteUpsertForm
from src.models.enum import EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.errors import ErrorResponse
from src.serializes.votes import VoteItem
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentJourneyScenarioDep,
    VoteManagerDep,
)

router = APIRouter(prefix="/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/votes", tags=["api.journeys.scenarios.votes"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Journey or scenario not found"}}


@router.get(
    "",
    operation_id="api_journeys_scenarios_votes_list",
    summary="List scenario votes",
    description="List the votes on a journey scenario, oldest first. Any member may read.",
    response_model=ListingResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def list_scenario_votes(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    scenario: CurrentJourneyScenarioDep,
    manager: VoteManagerDep,
) -> ListingResponse[VoteItem]:
    rows = manager.list_for_entity(account, EntityType.JOURNEY_SCENARIO, scenario.id)
    return ListingResponse.single_page([VoteItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_journeys_scenarios_votes_create",
    summary="Vote on a scenario",
    description=(
        "Cast or update your vote on a journey scenario. Any member may vote; a member holds "
        "at most one vote per entity, so voting again replaces it. The vote's role is taken "
        "from your voting role."
    ),
    response_model=ItemResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def create_scenario_vote(
    form: VoteUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    scenario: CurrentJourneyScenarioDep,
    manager: VoteManagerDep,
) -> ItemResponse[VoteItem]:
    vote = manager.upsert(
        account, member, entity_type=EntityType.JOURNEY_SCENARIO, entity_id=scenario.id, value=form.value
    )
    return ItemResponse(item=VoteItem.model_validate(vote))
