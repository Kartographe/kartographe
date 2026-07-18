# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/services/{service_id}/actions/{action_id}/votes`.

List and cast votes on a service action. Any account member may read and vote.
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
    CurrentServiceActionDep,
    VoteManagerDep,
)

router = APIRouter(prefix="/accounts/{account_id}/services/{service_id}/actions/{action_id}/votes", tags=["api.services.actions.votes"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Service or action not found"}}


@router.get(
    "",
    operation_id="api_services_actions_votes_list",
    summary="List service action votes",
    description="List the votes on a service action, oldest first. Any member may read.",
    response_model=ListingResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def list_action_votes(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    action: CurrentServiceActionDep,
    manager: VoteManagerDep,
) -> ListingResponse[VoteItem]:
    rows = manager.list_for_entity(account, EntityType.SERVICE_ACTION, action.id)
    return ListingResponse.single_page([VoteItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_services_actions_votes_create",
    summary="Vote on a service action",
    description=(
        "Cast or update your vote on a service action. Any member may vote; a member holds "
        "at most one vote per entity, so voting again replaces it. The vote's role is taken "
        "from your voting role."
    ),
    response_model=ItemResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def create_action_vote(
    form: VoteUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    action: CurrentServiceActionDep,
    manager: VoteManagerDep,
) -> ItemResponse[VoteItem]:
    vote = manager.upsert(
        account, member, entity_type=EntityType.SERVICE_ACTION, entity_id=action.id, value=form.value
    )
    return ItemResponse(item=VoteItem.model_validate(vote))
