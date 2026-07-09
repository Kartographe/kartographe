"""`/v1/accounts/{account_id}/comments` — account-wide comment management.

Any member may read comments and post replies; editing, removing or deleting a
comment is restricted to its author or an owner/administrator.
"""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Query, status

from src.filters._base import SortOrder
from src.filters.comments import CommentSortField
from src.forms.comments import CommentCreateForm, CommentPatchForm
from src.models.enum import CommentEntityType, CommentStatus
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.comments import CommentItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CommentManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentCommentDep,
    CurrentUserDep,
    ModifiableCommentDep,
)

router = APIRouter(prefix="/accounts/{account_id}/comments", tags=["api.comments"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this comment"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account or comment not found"}}


@router.get(
    "",
    operation_id="api.comments.list",
    summary="List comments",
    description=(
        "List the comments of the account, most recent first. Filter by entity type, entity id, "
        "owner and/or status (repeat the query param for multiple values), restrict to a date "
        "range with `lbound` / `ubound` (inclusive bounds on the comment's date, ISO-8601), and "
        "sort by date/status/statusDate. Any member may read."
    ),
    response_model=ListingResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def list_comments(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: CommentManagerDep,
    entity_type: Annotated[list[CommentEntityType] | None, Query(alias="entityType")] = None,
    entity_id: Annotated[list[uuid.UUID] | None, Query(alias="entityId")] = None,
    owner_id: Annotated[list[uuid.UUID] | None, Query(alias="ownerId")] = None,
    comment_status: Annotated[list[CommentStatus] | None, Query(alias="status")] = None,
    lbound: Annotated[datetime | None, Query()] = None,
    ubound: Annotated[datetime | None, Query()] = None,
    sort_by: Annotated[CommentSortField, Query(alias="sortBy")] = CommentSortField.DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
) -> ListingResponse[CommentItem]:
    rows = manager.list_for_account(
        account,
        entity_types=entity_type,
        entity_ids=entity_id,
        owner_ids=owner_id,
        statuses=comment_status,
        lbound=lbound,
        ubound=ubound,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    items = [CommentItem.model_validate(row) for row in rows]
    return ListingResponse.single_page(items)


@router.get(
    "/{comment_id}",
    operation_id="api.comments.get",
    summary="Get a comment",
    description="Return a single comment of the account. Any member may read.",
    response_model=ItemResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def get_comment(_: CurrentAccountUserDep, comment: CurrentCommentDep) -> ItemResponse[CommentItem]:
    return ItemResponse(item=CommentItem.model_validate(comment))


@router.patch(
    "/{comment_id}",
    operation_id="api.comments.update",
    summary="Edit a comment",
    description="Edit a comment's content. The author or an owner/administrator only.",
    response_model=ItemResponse[CommentItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_comment(
    form: CommentPatchForm, comment: ModifiableCommentDep, manager: CommentManagerDep
) -> ItemResponse[CommentItem]:
    updated = manager.update_value(comment, form.value)
    return ItemResponse(item=CommentItem.model_validate(updated))


@router.post(
    "/{comment_id}/remove",
    operation_id="api.comments.remove",
    summary="Remove a comment",
    description=(
        "Mark a comment as removed and drop its content, keeping the thread. "
        "The author or an owner/administrator only."
    ),
    response_model=ItemResponse[CommentItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def remove_comment(
    comment: ModifiableCommentDep, manager: CommentManagerDep
) -> ItemResponse[CommentItem]:
    updated = manager.remove(comment)
    return ItemResponse(item=CommentItem.model_validate(updated))


@router.delete(
    "/{comment_id}",
    operation_id="api.comments.delete",
    summary="Delete a comment",
    description=(
        "Soft-delete a comment and its direct replies. The author or an owner/administrator only."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_comment(comment: ModifiableCommentDep, manager: CommentManagerDep) -> None:
    manager.soft_delete(comment)


@router.get(
    "/{comment_id}/replies",
    operation_id="api.comments.replies.list",
    summary="List replies",
    description="List the direct replies to a comment, oldest first. Any member may read.",
    response_model=ListingResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def list_replies(
    _: CurrentAccountUserDep, comment: CurrentCommentDep, manager: CommentManagerDep
) -> ListingResponse[CommentItem]:
    items = [CommentItem.model_validate(row) for row in manager.list_replies(comment)]
    return ListingResponse.single_page(items)


@router.post(
    "/{comment_id}/replies",
    operation_id="api.comments.replies.create",
    summary="Reply to a comment",
    description="Post a reply to a comment. Any member may reply.",
    response_model=ItemResponse[CommentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_reply(
    form: CommentCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    comment: CurrentCommentDep,
    _: CurrentAccountUserDep,
    manager: CommentManagerDep,
) -> ItemResponse[CommentItem]:
    reply = manager.create_reply(account, user, comment, value=form.value)
    return ItemResponse(item=CommentItem.model_validate(reply))
