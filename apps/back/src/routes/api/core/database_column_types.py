"""`/v1/core/databaseColumnTypes` — global catalogue of SQL column types.

Reference data shared by every account; any authenticated user may read it,
optionally filtered by database engine.
"""

from typing import Annotated

from fastapi import APIRouter, Query

from src.models.enum import DatabaseType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.core import DatabaseColumnTypeItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import CoreManagerDep, CurrentDatabaseColumnTypeDep, CurrentUserDep

router = APIRouter(prefix="/core/databaseColumnTypes", tags=["api.core.databaseColumnTypes"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Column type not found"}}


@router.get(
    "",
    operation_id="api.core.databaseColumnTypes.list",
    summary="List database column types",
    description="List the available SQL column types, optionally filtered by database engine.",
    response_model=ListingResponse[DatabaseColumnTypeItem],
)
def list_database_column_types(
    _: CurrentUserDep,
    manager: CoreManagerDep,
    database_type: Annotated[DatabaseType | None, Query(alias="databaseType")] = None,
) -> ListingResponse[DatabaseColumnTypeItem]:
    rows = manager.list_database_column_types(database_type=database_type)
    return ListingResponse.single_page([DatabaseColumnTypeItem.model_validate(row) for row in rows])


@router.get(
    "/{database_column_type_id}",
    operation_id="api.core.databaseColumnTypes.get",
    summary="Get a database column type",
    description="Return a single SQL column type.",
    response_model=ItemResponse[DatabaseColumnTypeItem],
    responses={**_NOT_FOUND},
)
def get_database_column_type(
    _: CurrentUserDep, column_type: CurrentDatabaseColumnTypeDep
) -> ItemResponse[DatabaseColumnTypeItem]:
    return ItemResponse(item=DatabaseColumnTypeItem.model_validate(column_type))
