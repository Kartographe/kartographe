# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/votes`.

List and cast votes on a database column. Any account member may read and vote.
"""

from fastapi import APIRouter

from src.forms.votes import VoteUpsertForm
from src.models.enum import EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.errors import ErrorResponse
from src.serializes.votes import VoteItem
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentDatabaseTableColumnDep,
    VoteManagerDep,
)

router = APIRouter(prefix="/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/votes", tags=["api.databases.versions.tables.columns.votes"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Column not found"}}


@router.get(
    "",
    operation_id="api_databases_versions_tables_columns_votes_list",
    summary="List column votes",
    description="List the votes on a database column, oldest first. Any member may read.",
    response_model=ListingResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def list_column_votes(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    column: CurrentDatabaseTableColumnDep,
    manager: VoteManagerDep,
) -> ListingResponse[VoteItem]:
    rows = manager.list_for_entity(account, EntityType.DATABASE_TABLE_COLUMN, column.id)
    return ListingResponse.single_page([VoteItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_databases_versions_tables_columns_votes_create",
    summary="Vote on a column",
    description=(
        "Cast or update your vote on a database column. Any member may vote; a member holds "
        "at most one vote per entity, so voting again replaces it. The vote's role is taken "
        "from your voting role."
    ),
    response_model=ItemResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def create_column_vote(
    form: VoteUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    column: CurrentDatabaseTableColumnDep,
    manager: VoteManagerDep,
) -> ItemResponse[VoteItem]:
    vote = manager.upsert(
        account, member, entity_type=EntityType.DATABASE_TABLE_COLUMN, entity_id=column.id, value=form.value
    )
    return ItemResponse(item=VoteItem.model_validate(vote))
