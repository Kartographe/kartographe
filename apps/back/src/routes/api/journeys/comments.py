"""`/v1/accounts/{account_id}/journeys/{journey_id}/comments`.

List and post comments on a journey. Any account member may read and post.
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
    CurrentJourneyDep,
    CurrentUserDep,
)

router = APIRouter(
    prefix="/accounts/{account_id}/journeys/{journey_id}/comments", tags=["api.journeys.comments"]
)

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Journey not found"}}


@router.get(
    "",
    operation_id="api.journeys.comments.list",
    summary="List journey comments",
    description="List the root comments on a journey, oldest first. Any member may read.",
    response_model=ListingResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def list_journey_comments(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    journey: CurrentJourneyDep,
    manager: CommentManagerDep,
) -> ListingResponse[CommentItem]:
    rows = manager.list_for_entity(account, CommentEntityType.JOURNEY, journey.id)
    return ListingResponse.single_page([CommentItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api.journeys.comments.create",
    summary="Comment on a journey",
    description="Post a comment on a journey. Any member may post.",
    response_model=ItemResponse[CommentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_journey_comment(
    form: CommentCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    journey: CurrentJourneyDep,
    manager: CommentManagerDep,
) -> ItemResponse[CommentItem]:
    comment = manager.create(
        account, user, entity_type=CommentEntityType.JOURNEY, entity_id=journey.id, value=form.value
    )
    return ItemResponse(item=CommentItem.model_validate(comment))
