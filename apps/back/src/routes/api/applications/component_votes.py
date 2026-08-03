# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/applications/{application_id}/components/{component_id}/votes`.

List and cast votes on an application component. Any account member may read and vote.
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
    CurrentApplicationComponentDep,
    VoteManagerDep,
)

router = APIRouter(prefix="/accounts/{account_id}/applications/{application_id}/components/{component_id}/votes", tags=["api.applications.components.votes"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Application or component not found"}}


@router.get(
    "",
    operation_id="api_applications_components_votes_list",
    summary="List component votes",
    description="List the votes on an application component, oldest first. Any member may read.",
    response_model=ListingResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def list_component_votes(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    component: CurrentApplicationComponentDep,
    manager: VoteManagerDep,
) -> ListingResponse[VoteItem]:
    rows = manager.list_for_entity(account, EntityType.APPLICATION_COMPONENT, component.id)
    return ListingResponse.single_page([VoteItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_applications_components_votes_create",
    summary="Vote on a component",
    description=(
        "Cast or update your vote on an application component. Any member may vote; a member holds "
        "at most one vote per entity, so voting again replaces it. The vote's role is taken "
        "from your voting role."
    ),
    response_model=ItemResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def create_component_vote(
    form: VoteUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    component: CurrentApplicationComponentDep,
    manager: VoteManagerDep,
) -> ItemResponse[VoteItem]:
    vote = manager.upsert(
        account, member, entity_type=EntityType.APPLICATION_COMPONENT, entity_id=component.id, value=form.value
    )
    return ItemResponse(item=VoteItem.model_validate(vote))
