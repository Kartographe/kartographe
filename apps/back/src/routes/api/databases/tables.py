# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../databases/{database_id}/versions/{database_version_id}/tables`.

Tables of a database version. Reads are open to any account member; writes are
restricted to the data roles. A table can be created with its columns in one
call, and a table update that sends `columns` fully replaces them. Deleting a
table cascades to its columns.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.filters._base import MyComplexityFilter, MyVoteFilter
from src.forms._bulk import BulkCreateRequest
from src.forms.databases import DatabaseTableCreateForm, DatabaseTablePatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.databases import DatabaseTableItem
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentDatabaseTableDep,
    CurrentDatabaseVersionDep,
    CurrentUserDep,
    DatabaseTableManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
    tags=["api.databases.versions.tables"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Version, table or column type not found"}}

_DATA = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DATA_ANALYST,
)


@router.get(
    "",
    operation_id="api_databases_versions_tables_list",
    summary="List tables",
    description=(
        "List the tables of a database version, most recent first, each with its columns. "
        "Filter with `tagIds` (repeat the query param) to keep only the tables carrying at "
        "least one of those tags. Any member may read."
    ),
    response_model=ListingResponse[DatabaseTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_tables(
    member: CurrentAccountUserDep,
    version: CurrentDatabaseVersionDep,
    manager: DatabaseTableManagerDep,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
    my_vote: MyVoteFilter = None,
    my_complexity: MyComplexityFilter = None,
) -> ListingResponse[DatabaseTableItem]:
    items = manager.enrich(
        EntityType.DATABASE_TABLE,
        manager.to_items(
            manager.list_for_version(version, tag_ids=tag_ids, my_vote=my_vote, my_complexity=my_complexity, user_id=member.user_id)
        ),
        user_id=member.user_id,
    )
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_databases_versions_tables_create",
    summary="Create a table",
    description=(
        "Create a table, optionally with its columns in one call. Each column references a "
        "catalogued column type and may model a foreign key. Data roles only."
    ),
    response_model=ItemResponse[DatabaseTableItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_table(
    form: DatabaseTableCreateForm,
    version: CurrentDatabaseVersionDep,
    user: CurrentUserDep,
    manager: DatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseTableItem]:
    table = manager.create(
        version,
        user,
        type=form.type,
        schema=form.table_schema,
        name=form.name,
        description=form.description,
        color=form.color,
        column_forms=form.columns,
        tag_ids=form.tag_ids,
    )
    return ItemResponse(item=manager.to_item(table, with_columns=True))


@router.post(
    "/bulk",
    operation_id="api_databases_versions_tables_bulk_create",
    summary="Create several tables at once",
    description=(
        "Create 1 to 50 tables in a single call — prefer this over calling "
        "`api_databases_versions_tables_create` in a loop when adding many. Best-effort: each "
        "table is created independently, so one failing item does not roll back the others. Always "
        "returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the "
        "single create, columns included. Data roles only."
    ),
    response_model=BulkCreateResponse[DatabaseTableItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_tables(
    body: BulkCreateRequest[DatabaseTableCreateForm],
    version: CurrentDatabaseVersionDep,
    user: CurrentUserDep,
    manager: DatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> BulkCreateResponse[DatabaseTableItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            version,
            user,
            type=form.type,
            schema=form.table_schema,
            name=form.name,
            description=form.description,
            color=form.color,
            column_forms=form.columns,
            tag_ids=form.tag_ids,
        ),
        serialize=lambda e: manager.to_item(e, with_columns=True),
    )


@router.get(
    "/{database_table_id}",
    operation_id="api_databases_versions_tables_get",
    summary="Get a table",
    description="Return a single table of the version, including its columns. Any member may read.",
    response_model=ItemResponse[DatabaseTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_table(
    _: CurrentAccountUserDep,
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableManagerDep,
) -> ItemResponse[DatabaseTableItem]:
    return ItemResponse(item=manager.enrich_one(EntityType.DATABASE_TABLE, manager.to_item(table, with_columns=True)))


@router.patch(
    "/{database_table_id}",
    operation_id="api_databases_versions_tables_update",
    summary="Update a table",
    description=(
        "Partially update a table (type, schema, name, description, color, status). If `columns` is sent, "
        "it fully replaces the table's columns. Data roles only."
    ),
    response_model=ItemResponse[DatabaseTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_table(
    form: DatabaseTablePatchForm,
    table: CurrentDatabaseTableDep,
    user: CurrentUserDep,
    manager: DatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> ItemResponse[DatabaseTableItem]:
    sent = form.model_dump(exclude_unset=True)
    scalar_fields = {key: value for key, value in sent.items() if key != "columns"}
    column_forms = form.columns if "columns" in sent else None
    updated = manager.update(table, user, fields=scalar_fields, column_forms=column_forms)
    return ItemResponse(item=manager.to_item(updated, with_columns=True))


@router.delete(
    "/{database_table_id}",
    operation_id="api_databases_versions_tables_delete",
    summary="Delete a table",
    description="Soft-delete a table; its columns are soft-deleted as well. Data roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_table(
    table: CurrentDatabaseTableDep,
    manager: DatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_DATA)],
) -> None:
    manager.soft_delete(table)


_LOCK_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


@router.post(
    "/{database_table_id}/lock",
    operation_id="api_databases_versions_tables_lock",
    summary="Lock a table",
    description=(
        "Freeze the table against edits and deletion; comments, votes and child "
        "entities stay available. Owners and administrators only."
    ),
    response_model=ItemResponse[DatabaseTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def lock_table(
    entity: CurrentDatabaseTableDep,
    user: CurrentUserDep,
    manager: DatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[DatabaseTableItem]:
    return ItemResponse(item=DatabaseTableItem.model_validate(manager.lock(entity, user)))


@router.post(
    "/{database_table_id}/unlock",
    operation_id="api_databases_versions_tables_unlock",
    summary="Unlock a table",
    description="Lift the freeze on the table. Owners and administrators only.",
    response_model=ItemResponse[DatabaseTableItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def unlock_table(
    entity: CurrentDatabaseTableDep,
    manager: DatabaseTableManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[DatabaseTableItem]:
    return ItemResponse(item=DatabaseTableItem.model_validate(manager.unlock(entity)))
