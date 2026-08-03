# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/applications/{application_id}/bounded-contexts/{bounded_context_id}/votes`.

List and cast votes on an application bounded context. Any account member may read and vote.
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
    CurrentApplicationBoundedContextDep,
    VoteManagerDep,
)

router = APIRouter(prefix="/accounts/{account_id}/applications/{application_id}/bounded-contexts/{bounded_context_id}/votes", tags=["api.applications.boundedContexts.votes"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Application or bounded context not found"}}


@router.get(
    "",
    operation_id="api_applications_boundedContexts_votes_list",
    summary="List bounded context votes",
    description="List the votes on an application bounded context, oldest first. Any member may read.",
    response_model=ListingResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def list_bounded_context_votes(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    context: CurrentApplicationBoundedContextDep,
    manager: VoteManagerDep,
) -> ListingResponse[VoteItem]:
    rows = manager.list_for_entity(account, EntityType.APPLICATION_BOUNDED_CONTEXT, context.id)
    return ListingResponse.single_page([VoteItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_applications_boundedContexts_votes_create",
    summary="Vote on a bounded context",
    description=(
        "Cast or update your vote on an application bounded context. Any member may vote; a member holds "
        "at most one vote per entity, so voting again replaces it. The vote's role is taken "
        "from your voting role."
    ),
    response_model=ItemResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def create_bounded_context_vote(
    form: VoteUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    context: CurrentApplicationBoundedContextDep,
    manager: VoteManagerDep,
) -> ItemResponse[VoteItem]:
    vote = manager.upsert(
        account, member, entity_type=EntityType.APPLICATION_BOUNDED_CONTEXT, entity_id=context.id, value=form.value
    )
    return ItemResponse(item=VoteItem.model_validate(vote))
