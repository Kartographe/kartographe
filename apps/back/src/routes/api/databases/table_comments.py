# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/comments`.

List and post comments on a database table. Any account member may read and post.
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
    CurrentDatabaseTableDep,
    CurrentUserDep,
)

router = APIRouter(
    prefix="/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/comments",
    tags=["api.databases.versions.tables.comments"],
)

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Table not found"}}


@router.get(
    "",
    operation_id="api.databases.versions.tables.comments.list",
    summary="List table comments",
    description="List the root comments on a database table, oldest first. Any member may read.",
    response_model=ListingResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def list_table_comments(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    table: CurrentDatabaseTableDep,
    manager: CommentManagerDep,
) -> ListingResponse[CommentItem]:
    rows = manager.list_for_entity(account, CommentEntityType.DATABASE_TABLE, table.id)
    return ListingResponse.single_page([CommentItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api.databases.versions.tables.comments.create",
    summary="Comment on a table",
    description="Post a comment on a database table. Any member may post.",
    response_model=ItemResponse[CommentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_table_comment(
    form: CommentCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    table: CurrentDatabaseTableDep,
    manager: CommentManagerDep,
) -> ItemResponse[CommentItem]:
    comment = manager.create(
        account,
        user,
        entity_type=CommentEntityType.DATABASE_TABLE,
        entity_id=table.id,
        value=form.value,
    )
    return ItemResponse(item=CommentItem.model_validate(comment))
