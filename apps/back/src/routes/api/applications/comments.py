# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/applications/{application_id}/comments`.

List and post comments on an application. Any account member may read and post.
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
    CurrentApplicationDep,
    CurrentUserDep,
)

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/comments", tags=["api.applications.comments"]
)

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Application not found"}}


@router.get(
    "",
    operation_id="api_applications_comments_list",
    summary="List application comments",
    description="List the root comments on an application, oldest first. Any member may read.",
    response_model=ListingResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def list_application_comments(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: CommentManagerDep,
) -> ListingResponse[CommentItem]:
    rows = manager.list_for_entity(account, EntityType.APPLICATION, application.id)
    return ListingResponse.single_page([CommentItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_applications_comments_create",
    summary="Comment on an application",
    description="Post a comment on an application. Any member may post.",
    response_model=ItemResponse[CommentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_application_comment(
    form: CommentCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: CommentManagerDep,
) -> ItemResponse[CommentItem]:
    comment = manager.create(
        account,
        user,
        entity_type=EntityType.APPLICATION,
        entity_id=application.id,
        value=form.value,
    )
    return ItemResponse(item=CommentItem.model_validate(comment))


@router.post(
    "/bulk",
    operation_id="api_applications_comments_bulk_create",
    summary="Post several comments on an application at once",
    description=(
        "Post 1 to 50 comments on an application in a single call — prefer this over calling "
        "`api_applications_comments_create` in a loop. Best-effort: each comment is posted "
        "independently, so one failing item does not roll back the others. Always returns "
        "207; read each `results[].status` and the `created` / `failed` counts. Any member "
        "may post."
    ),
    response_model=BulkCreateResponse[CommentItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_NOT_FOUND},
)
def bulk_create_application_comments(
    body: BulkCreateRequest[CommentCreateForm],
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: CommentManagerDep,
) -> BulkCreateResponse[CommentItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            account, user, entity_type=EntityType.APPLICATION, entity_id=application.id, value=form.value
        ),
        serialize=CommentItem.model_validate,
    )
