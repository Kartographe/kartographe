# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../scenarios/{scenario_id}/steps/{step_id}/comments`.

List and post comments on a journey scenario step. Any account member may read
and post.
"""

from fastapi import APIRouter, status

from src.forms.comments import CommentCreateForm
from src.models.enum import EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.comments import CommentItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CommentManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentJourneyScenarioStepDep,
    CurrentUserDep,
)

router = APIRouter(
    prefix="/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/comments",
    tags=["api.journeys.scenarios.steps.comments"],
)

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Journey, scenario or step not found"}}


@router.get(
    "",
    operation_id="api_journeys_scenarios_steps_comments_list",
    summary="List step comments",
    description="List the root comments on a scenario step, oldest first. Any member may read.",
    response_model=ListingResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def list_step_comments(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    step: CurrentJourneyScenarioStepDep,
    manager: CommentManagerDep,
) -> ListingResponse[CommentItem]:
    rows = manager.list_for_entity(account, EntityType.JOURNEY_SCENARIO_STEP, step.id)
    return ListingResponse.single_page([CommentItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_journeys_scenarios_steps_comments_create",
    summary="Comment on a step",
    description="Post a comment on a scenario step. Any member may post.",
    response_model=ItemResponse[CommentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_step_comment(
    form: CommentCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    step: CurrentJourneyScenarioStepDep,
    manager: CommentManagerDep,
) -> ItemResponse[CommentItem]:
    comment = manager.create(
        account,
        user,
        entity_type=EntityType.JOURNEY_SCENARIO_STEP,
        entity_id=step.id,
        value=form.value,
    )
    return ItemResponse(item=CommentItem.model_validate(comment))
