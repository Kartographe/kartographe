"""`.../databases/{database_id}/migrations/{database_migration_id}/comments`.

List and post comments on a database migration. Any account member may read and post.
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
    CurrentDatabaseMigrationDep,
    CurrentUserDep,
)

router = APIRouter(
    prefix="/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/comments",
    tags=["api.databases.migrations.comments"],
)

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Migration not found"}}


@router.get(
    "",
    operation_id="api.databases.migrations.comments.list",
    summary="List migration comments",
    description="List the root comments on a database migration, oldest first. Any member may read.",
    response_model=ListingResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def list_migration_comments(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    migration: CurrentDatabaseMigrationDep,
    manager: CommentManagerDep,
) -> ListingResponse[CommentItem]:
    rows = manager.list_for_entity(account, CommentEntityType.DATABASE_MIGRATION, migration.id)
    return ListingResponse.single_page([CommentItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api.databases.migrations.comments.create",
    summary="Comment on a migration",
    description="Post a comment on a database migration. Any member may post.",
    response_model=ItemResponse[CommentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_migration_comment(
    form: CommentCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    migration: CurrentDatabaseMigrationDep,
    manager: CommentManagerDep,
) -> ItemResponse[CommentItem]:
    comment = manager.create(
        account,
        user,
        entity_type=CommentEntityType.DATABASE_MIGRATION,
        entity_id=migration.id,
        value=form.value,
    )
    return ItemResponse(item=CommentItem.model_validate(comment))
