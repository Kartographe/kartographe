# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../tables/{database_table_id}/columns/{database_table_column_id}/comments`.

List and post comments on a database column. Any account member may read and post.
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
    CurrentDatabaseTableColumnDep,
    CurrentUserDep,
)

router = APIRouter(
    prefix="/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/comments",
    tags=["api.databases.versions.tables.columns.comments"],
)

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Column not found"}}


@router.get(
    "",
    operation_id="api_databases_versions_tables_columns_comments_list",
    summary="List column comments",
    description="List the root comments on a database column, oldest first. Any member may read.",
    response_model=ListingResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def list_column_comments(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    column: CurrentDatabaseTableColumnDep,
    manager: CommentManagerDep,
) -> ListingResponse[CommentItem]:
    rows = manager.list_for_entity(account, CommentEntityType.DATABASE_TABLE_COLUMN, column.id)
    return ListingResponse.single_page([CommentItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_databases_versions_tables_columns_comments_create",
    summary="Comment on a column",
    description="Post a comment on a database column. Any member may post.",
    response_model=ItemResponse[CommentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_column_comment(
    form: CommentCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    column: CurrentDatabaseTableColumnDep,
    manager: CommentManagerDep,
) -> ItemResponse[CommentItem]:
    comment = manager.create(
        account,
        user,
        entity_type=CommentEntityType.DATABASE_TABLE_COLUMN,
        entity_id=column.id,
        value=form.value,
    )
    return ItemResponse(item=CommentItem.model_validate(comment))
