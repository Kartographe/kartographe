# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/journeys/{journey_id}/votes`.

List and cast votes on a journey. Any account member may read and vote.
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
    CurrentJourneyDep,
    VoteManagerDep,
)

router = APIRouter(prefix="/accounts/{account_id}/journeys/{journey_id}/votes", tags=["api.journeys.votes"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Journey not found"}}


@router.get(
    "",
    operation_id="api_journeys_votes_list",
    summary="List journey votes",
    description="List the votes on a journey, oldest first. Any member may read.",
    response_model=ListingResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def list_journey_votes(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    journey: CurrentJourneyDep,
    manager: VoteManagerDep,
) -> ListingResponse[VoteItem]:
    rows = manager.list_for_entity(account, EntityType.JOURNEY, journey.id)
    return ListingResponse.single_page([VoteItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_journeys_votes_create",
    summary="Vote on a journey",
    description=(
        "Cast or update your vote on a journey. Any member may vote; a member holds "
        "at most one vote per entity, so voting again replaces it. The vote's role is taken "
        "from your voting role."
    ),
    response_model=ItemResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def create_journey_vote(
    form: VoteUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    journey: CurrentJourneyDep,
    manager: VoteManagerDep,
) -> ItemResponse[VoteItem]:
    vote = manager.upsert(
        account, member, entity_type=EntityType.JOURNEY, entity_id=journey.id, value=form.value
    )
    return ItemResponse(item=VoteItem.model_validate(vote))
