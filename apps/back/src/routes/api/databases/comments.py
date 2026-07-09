"""`/v1/accounts/{account_id}/databases/{database_id}/comments`.

List and post comments on a database. Any account member may read and post.
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
    CurrentDatabaseDep,
    CurrentUserDep,
)

router = APIRouter(
    prefix="/accounts/{account_id}/databases/{database_id}/comments", tags=["api.databases.comments"]
)

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Database not found"}}


@router.get(
    "",
    operation_id="api.databases.comments.list",
    summary="List database comments",
    description="List the root comments on a database, oldest first. Any member may read.",
    response_model=ListingResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def list_database_comments(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    database: CurrentDatabaseDep,
    manager: CommentManagerDep,
) -> ListingResponse[CommentItem]:
    rows = manager.list_for_entity(account, CommentEntityType.DATABASE, database.id)
    return ListingResponse.single_page([CommentItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api.databases.comments.create",
    summary="Comment on a database",
    description="Post a comment on a database. Any member may post.",
    response_model=ItemResponse[CommentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_database_comment(
    form: CommentCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    database: CurrentDatabaseDep,
    manager: CommentManagerDep,
) -> ItemResponse[CommentItem]:
    comment = manager.create(
        account, user, entity_type=CommentEntityType.DATABASE, entity_id=database.id, value=form.value
    )
    return ItemResponse(item=CommentItem.model_validate(comment))
