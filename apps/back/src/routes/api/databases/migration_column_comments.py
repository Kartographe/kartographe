"""`.../migrations/{database_migration_id}/columns/{database_migration_column_id}/comments`.

List and post comments on a migration column step. Any account member may read and post.
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
    CurrentDatabaseMigrationColumnDep,
    CurrentUserDep,
)

router = APIRouter(
    prefix="/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns/{database_migration_column_id}/comments",
    tags=["api.databases.migrations.columns.comments"],
)

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Migration column not found"}}


@router.get(
    "",
    operation_id="api.databases.migrations.columns.comments.list",
    summary="List migration column comments",
    description=(
        "List the root comments on a migration column step, oldest first. Any member may read."
    ),
    response_model=ListingResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def list_migration_column_comments(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    column: CurrentDatabaseMigrationColumnDep,
    manager: CommentManagerDep,
) -> ListingResponse[CommentItem]:
    rows = manager.list_for_entity(
        account, CommentEntityType.DATABASE_MIGRATION_COLUMN, column.id
    )
    return ListingResponse.single_page([CommentItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api.databases.migrations.columns.comments.create",
    summary="Comment on a migration column",
    description="Post a comment on a migration column step. Any member may post.",
    response_model=ItemResponse[CommentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_migration_column_comment(
    form: CommentCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    column: CurrentDatabaseMigrationColumnDep,
    manager: CommentManagerDep,
) -> ItemResponse[CommentItem]:
    comment = manager.create(
        account,
        user,
        entity_type=CommentEntityType.DATABASE_MIGRATION_COLUMN,
        entity_id=column.id,
        value=form.value,
    )
    return ItemResponse(item=CommentItem.model_validate(comment))
