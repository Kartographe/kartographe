# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/features/{feature_id}/comments`.

List and post comments on a feature. Any account member may read and post.
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
    CurrentFeatureDep,
    CurrentUserDep,
)

router = APIRouter(
    prefix="/accounts/{account_id}/features/{feature_id}/comments", tags=["api.features.comments"]
)

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Feature not found"}}


@router.get(
    "",
    operation_id="api.features.comments.list",
    summary="List feature comments",
    description="List the root comments on a feature, oldest first. Any member may read.",
    response_model=ListingResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def list_feature_comments(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    feature: CurrentFeatureDep,
    manager: CommentManagerDep,
) -> ListingResponse[CommentItem]:
    rows = manager.list_for_entity(account, CommentEntityType.FEATURE, feature.id)
    return ListingResponse.single_page([CommentItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api.features.comments.create",
    summary="Comment on a feature",
    description="Post a comment on a feature. Any member may post.",
    response_model=ItemResponse[CommentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_feature_comment(
    form: CommentCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    feature: CurrentFeatureDep,
    manager: CommentManagerDep,
) -> ItemResponse[CommentItem]:
    comment = manager.create(
        account, user, entity_type=CommentEntityType.FEATURE, entity_id=feature.id, value=form.value
    )
    return ItemResponse(item=CommentItem.model_validate(comment))
