# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../journeys/{journey_id}/scenarios/{scenario_id}/comments`.

List and post comments on a journey scenario. Any account member may read and
post.
"""

from fastapi import APIRouter, status

from src.forms.comments import CommentCreateForm
from src.models.enum import CommentEntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.comments import CommentItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CommentManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentJourneyScenarioDep,
    CurrentUserDep,
)

router = APIRouter(
    prefix="/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/comments",
    tags=["api.journeys.scenarios.comments"],
)

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Journey or scenario not found"}}


@router.get(
    "",
    operation_id="api_journeys_scenarios_comments_list",
    summary="List scenario comments",
    description="List the root comments on a journey scenario, oldest first. Any member may read.",
    response_model=ListingResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def list_scenario_comments(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    scenario: CurrentJourneyScenarioDep,
    manager: CommentManagerDep,
) -> ListingResponse[CommentItem]:
    rows = manager.list_for_entity(account, CommentEntityType.JOURNEY_SCENARIO, scenario.id)
    return ListingResponse.single_page([CommentItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_journeys_scenarios_comments_create",
    summary="Comment on a scenario",
    description="Post a comment on a journey scenario. Any member may post.",
    response_model=ItemResponse[CommentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_scenario_comment(
    form: CommentCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    scenario: CurrentJourneyScenarioDep,
    manager: CommentManagerDep,
) -> ItemResponse[CommentItem]:
    comment = manager.create(
        account,
        user,
        entity_type=CommentEntityType.JOURNEY_SCENARIO,
        entity_id=scenario.id,
        value=form.value,
    )
    return ItemResponse(item=CommentItem.model_validate(comment))
