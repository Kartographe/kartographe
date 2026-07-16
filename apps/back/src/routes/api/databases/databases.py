# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/databases` — databases tracked in an account.

Reads are open to any account member; writes are restricted to owners,
administrators, lead developers and data analysts. Deleting a database cascades
a soft-delete to its versions, tables and columns.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.filters._base import PageLimit, SortOrder
from src.filters.databases import DatabaseSortField
from src.forms.databases import DatabaseCreateForm, DatabasePatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, DatabaseStatus, DatabaseType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.databases import DatabaseItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentDatabaseDep,
    CurrentUserDep,
    DatabaseManagerDep,
    TagManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(prefix="/accounts/{account_id}/databases", tags=["api.databases"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account or database not found"}}

_DATA = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DATA_ANALYST,
)


@router.get(
    "",
    operation_id="api.databases.list",
    summary="List databases",
    description=(
        "List the databases of the account. Filter by status and/or type (repeat the query param "
        "for multiple values), sort by date/title/status/type, and page through results. "
        "Any member may read. "
        "Filter with `tagIds` (repeat the query param) to keep only the entities carrying at least one of those tags. "
    ),
    response_model=ListingResponse[DatabaseItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_databases(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: DatabaseManagerDep,
    tags: TagManagerDep,
    database_status: Annotated[list[DatabaseStatus] | None, Query(alias="status")] = None,
    type: Annotated[list[DatabaseType] | None, Query(alias="type")] = None,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
    sort_by: Annotated[DatabaseSortField, Query(alias="sortBy")] = DatabaseSortField.DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[PageLimit, Query()] = PageLimit.L25,
) -> ListingResponse[DatabaseItem]:
    rows, total = manager.list_for_account(
        account,
        statuses=database_status,
        types=type,
        tag_ids=tag_ids,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit.value,
    )
    items = tags.attach(rows, DatabaseItem)
    return ListingResponse.paginate(items, count=total, page=page, limit=limit.value)


@router.post(
    "",
    operation_id="api.databases.create",
    summary="Create a database",
    description=(
        "Create a database. It starts as a draft owned by the caller. "
        "Owners, administrators, lead developers and data analysts only."
    ),
    response_model=ItemResponse[DatabaseItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_database(
    form: DatabaseCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    manager: DatabaseManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseItem]:
    database = manager.create(
        account, user, type=form.type, title=form.title, description=form.description, tag_ids=form.tag_ids
    )
    return ItemResponse(item=DatabaseItem.model_validate(database))


@router.get(
    "/{database_id}",
    operation_id="api.databases.get",
    summary="Get a database",
    description="Return a single database of the account. Any member may read.",
    response_model=ItemResponse[DatabaseItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_database(
    _: CurrentAccountUserDep, database: CurrentDatabaseDep, tags: TagManagerDep
) -> ItemResponse[DatabaseItem]:
    return ItemResponse(item=tags.attach_one(database, DatabaseItem))


@router.patch(
    "/{database_id}",
    operation_id="api.databases.update",
    summary="Update a database",
    description="Partially update a database (type, title, description). Data roles only.",
    response_model=ItemResponse[DatabaseItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_database(
    form: DatabasePatchForm,
    database: CurrentDatabaseDep,
    manager: DatabaseManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseItem]:
    updated = manager.apply_update(database, form.model_dump(exclude_unset=True))
    return ItemResponse(item=DatabaseItem.model_validate(updated))


@router.post(
    "/{database_id}/activate",
    operation_id="api.databases.activate",
    summary="Activate a database",
    description="Set the database status to active. Data roles only.",
    response_model=ItemResponse[DatabaseItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def activate_database(
    database: CurrentDatabaseDep,
    manager: DatabaseManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseItem]:
    updated = manager.set_status(database, DatabaseStatus.ACTIVE)
    return ItemResponse(item=DatabaseItem.model_validate(updated))


@router.post(
    "/{database_id}/archive",
    operation_id="api.databases.archive",
    summary="Archive a database",
    description="Set the database status to archived. Data roles only.",
    response_model=ItemResponse[DatabaseItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def archive_database(
    database: CurrentDatabaseDep,
    manager: DatabaseManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseItem]:
    updated = manager.set_status(database, DatabaseStatus.ARCHIVED)
    return ItemResponse(item=DatabaseItem.model_validate(updated))


@router.delete(
    "/{database_id}",
    operation_id="api.databases.delete",
    summary="Delete a database",
    description=(
        "Soft-delete a database; its versions, tables and columns are soft-deleted as well. "
        "Data roles only."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_database(
    database: CurrentDatabaseDep,
    manager: DatabaseManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> None:
    manager.soft_delete(database)
