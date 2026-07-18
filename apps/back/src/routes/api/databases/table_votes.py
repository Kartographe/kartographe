# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/votes`.

List and cast votes on a database table. Any account member may read and vote.
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
    CurrentDatabaseTableDep,
    VoteManagerDep,
)

router = APIRouter(prefix="/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/votes", tags=["api.databases.versions.tables.votes"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Table not found"}}


@router.get(
    "",
    operation_id="api_databases_versions_tables_votes_list",
    summary="List table votes",
    description="List the votes on a database table, oldest first. Any member may read.",
    response_model=ListingResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def list_table_votes(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    table: CurrentDatabaseTableDep,
    manager: VoteManagerDep,
) -> ListingResponse[VoteItem]:
    rows = manager.list_for_entity(account, EntityType.DATABASE_TABLE, table.id)
    return ListingResponse.single_page([VoteItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_databases_versions_tables_votes_create",
    summary="Vote on a table",
    description=(
        "Cast or update your vote on a database table. Any member may vote; a member holds "
        "at most one vote per entity, so voting again replaces it. The vote's role is taken "
        "from your voting role."
    ),
    response_model=ItemResponse[VoteItem],
    responses={**_NOT_FOUND},
)
def create_table_vote(
    form: VoteUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    table: CurrentDatabaseTableDep,
    manager: VoteManagerDep,
) -> ItemResponse[VoteItem]:
    vote = manager.upsert(
        account, member, entity_type=EntityType.DATABASE_TABLE, entity_id=table.id, value=form.value
    )
    return ItemResponse(item=VoteItem.model_validate(vote))
