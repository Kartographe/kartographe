# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../services/{service_id}/actions/{action_id}/comments`.

List and post comments on a service action. Any account member may read and post.
"""

from fastapi import APIRouter, status

from src.forms._bulk import BulkCreateRequest
from src.forms.comments import CommentCreateForm
from src.models.enum import EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.comments import CommentItem
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    CommentManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentServiceActionDep,
    CurrentUserDep,
)

router = APIRouter(
    prefix="/accounts/{account_id}/services/{service_id}/actions/{action_id}/comments",
    tags=["api.services.actions.comments"],
)

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Service or action not found"}}


@router.get(
    "",
    operation_id="api_services_actions_comments_list",
    summary="List action comments",
    description="List the root comments on a service action, oldest first. Any member may read.",
    response_model=ListingResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def list_action_comments(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    action: CurrentServiceActionDep,
    manager: CommentManagerDep,
) -> ListingResponse[CommentItem]:
    rows = manager.list_for_entity(account, EntityType.SERVICE_ACTION, action.id)
    return ListingResponse.single_page([CommentItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_services_actions_comments_create",
    summary="Comment on a service action",
    description="Post a comment on a service action. Any member may post.",
    response_model=ItemResponse[CommentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_action_comment(
    form: CommentCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    action: CurrentServiceActionDep,
    manager: CommentManagerDep,
) -> ItemResponse[CommentItem]:
    comment = manager.create(
        account,
        user,
        entity_type=EntityType.SERVICE_ACTION,
        entity_id=action.id,
        value=form.value,
    )
    return ItemResponse(item=CommentItem.model_validate(comment))


@router.post(
    "/bulk",
    operation_id="api_services_actions_comments_bulk_create",
    summary="Post several comments on a service action at once",
    description=(
        "Post 1 to 50 comments on a service action in a single call — prefer this over calling "
        "`api_services_actions_comments_create` in a loop. Best-effort: each comment is posted "
        "independently, so one failing item does not roll back the others. Always returns "
        "207; read each `results[].status` and the `created` / `failed` counts. Any member "
        "may post."
    ),
    response_model=BulkCreateResponse[CommentItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_NOT_FOUND},
)
def bulk_create_action_comments(
    body: BulkCreateRequest[CommentCreateForm],
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    action: CurrentServiceActionDep,
    manager: CommentManagerDep,
) -> BulkCreateResponse[CommentItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            account,
            user,
            entity_type=EntityType.SERVICE_ACTION,
            entity_id=action.id,
            value=form.value,
        ),
        serialize=CommentItem.model_validate,
    )
