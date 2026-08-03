# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/complexities`.

List and give complexity estimates on a database column. Any account member may read and estimate.
"""

from fastapi import APIRouter

from src.forms.complexities import ComplexityUpsertForm
from src.models.enum import EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.complexities import ComplexityItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    ComplexityManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentDatabaseTableColumnDep,
)

router = APIRouter(prefix="/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/complexities", tags=["api.databases.versions.tables.columns.complexities"])

_UNPROCESSABLE = {422: {"model": ErrorResponse, "description": "Value is not on the account's scale"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Column not found"}}


@router.get(
    "",
    operation_id="api_databases_versions_tables_columns_complexities_list",
    summary="List column complexity estimates",
    description="List the complexity estimates on a database column, oldest first. Any member may read.",
    response_model=ListingResponse[ComplexityItem],
    responses={**_NOT_FOUND},
)
def list_column_complexities(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    column: CurrentDatabaseTableColumnDep,
    manager: ComplexityManagerDep,
) -> ListingResponse[ComplexityItem]:
    rows = manager.list_for_entity(account, EntityType.DATABASE_TABLE_COLUMN, column.id)
    return ListingResponse.single_page([ComplexityItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_databases_versions_tables_columns_complexities_create",
    summary="Estimate the complexity of a column",
    description=(
        "Give or update your complexity estimate on a database column. Any member may estimate; "
        "a member holds at most one estimate per entity, so estimating again replaces it. "
        "The scale comes from the account's technical complexity mode; a value outside it "
        "is refused."
    ),
    response_model=ItemResponse[ComplexityItem],
    responses={**_NOT_FOUND, **_UNPROCESSABLE},
)
def create_column_complexity(
    form: ComplexityUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    column: CurrentDatabaseTableColumnDep,
    manager: ComplexityManagerDep,
) -> ItemResponse[ComplexityItem]:
    complexity = manager.upsert(
        account, member, entity_type=EntityType.DATABASE_TABLE_COLUMN, entity_id=column.id, value=form.value
    )
    return ItemResponse(item=ComplexityItem.model_validate(complexity))
