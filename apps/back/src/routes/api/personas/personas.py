# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/personas` — user archetypes tracked in an account.

Reads are open to any account member; writes are open to the editing roles
(owner, administrator, lead developer, product owner, QA manager, developer).
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.filters._base import MyComplexityFilter, MyVoteFilter, PageLimit, SortOrder
from src.filters.personas import PersonaSortField
from src.forms._bulk import BulkCreateRequest
from src.forms.personas import PersonaCreateForm, PersonaPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, EntityType, PersonaStatus, PersonaType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.personas import PersonaItem
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentPersonaDep,
    CurrentUserDep,
    PersonaManagerDep,
    TagManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(prefix="/accounts/{account_id}/personas", tags=["api.personas"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account or persona not found"}}

_EDITOR = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.PRODUCT_OWNER,
    AccountUserRole.QA_MANAGER,
    AccountUserRole.DEVELOPER,
)


@router.get(
    "",
    operation_id="api_personas_list",
    summary="List personas",
    description=(
        "List the personas of the account. Filter by status and/or type (repeat the query param "
        "for multiple values), sort by date/title/status/type, and page through results. "
        "Any member may read. "
        "Filter with `tagIds` (repeat the query param) to keep only the entities carrying at least one of those tags. "
    ),
    response_model=ListingResponse[PersonaItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_personas(
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    manager: PersonaManagerDep,
    tags: TagManagerDep,
    persona_status: Annotated[list[PersonaStatus] | None, Query(alias="status")] = None,
    type: Annotated[list[PersonaType] | None, Query(alias="type")] = None,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
    my_vote: MyVoteFilter = None,
    my_complexity: MyComplexityFilter = None,
    sort_by: Annotated[PersonaSortField, Query(alias="sortBy")] = PersonaSortField.DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[PageLimit, Query()] = PageLimit.L25,
) -> ListingResponse[PersonaItem]:
    rows, total = manager.list_for_account(
        account,
        statuses=persona_status,
        types=type,
        tag_ids=tag_ids,
        my_vote=my_vote,
        my_complexity=my_complexity,
        user_id=member.user_id,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit.value,
    )
    items = tags.enrich(EntityType.PERSONA, tags.attach(rows, PersonaItem), user_id=member.user_id)
    return ListingResponse.paginate(items, count=total, page=page, limit=limit.value)


@router.post(
    "",
    operation_id="api_personas_create",
    summary="Create a persona",
    description="Create a persona. It starts as a draft. Editing roles only.",
    response_model=ItemResponse[PersonaItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_persona(
    form: PersonaCreateForm,
    account: CurrentAccountDep,
    manager: PersonaManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[PersonaItem]:
    persona = manager.create(
        account, type=form.type, title=form.title, description=form.description, tag_ids=form.tag_ids
    )
    return ItemResponse(item=PersonaItem.model_validate(persona))


@router.post(
    "/bulk",
    operation_id="api_personas_bulk_create",
    summary="Create several personas at once",
    description=(
        "Create 1 to 50 personas in a single call — prefer this over calling "
        "`api_personas_create` in a loop when adding many. Best-effort: each persona is "
        "created independently, so one failing item does not roll back the others. Always "
        "returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the "
        "single create. Editing roles only."
    ),
    response_model=BulkCreateResponse[PersonaItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_personas(
    body: BulkCreateRequest[PersonaCreateForm],
    account: CurrentAccountDep,
    manager: PersonaManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> BulkCreateResponse[PersonaItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            account,
            type=form.type,
            title=form.title,
            description=form.description,
            tag_ids=form.tag_ids,
        ),
        serialize=PersonaItem.model_validate,
    )


@router.get(
    "/{persona_id}",
    operation_id="api_personas_get",
    summary="Get a persona",
    description="Return a single persona of the account. Any member may read.",
    response_model=ItemResponse[PersonaItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_persona(
    _: CurrentAccountUserDep, persona: CurrentPersonaDep, tags: TagManagerDep
) -> ItemResponse[PersonaItem]:
    return ItemResponse(item=tags.enrich_one(EntityType.PERSONA, tags.attach_one(persona, PersonaItem)))


@router.patch(
    "/{persona_id}",
    operation_id="api_personas_update",
    summary="Update a persona",
    description="Partially update a persona (type, title, description, status). Editing roles only.",
    response_model=ItemResponse[PersonaItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_persona(
    form: PersonaPatchForm,
    persona: CurrentPersonaDep,
    manager: PersonaManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[PersonaItem]:
    updated = manager.apply_update(persona, form.model_dump(exclude_unset=True))
    return ItemResponse(item=PersonaItem.model_validate(updated))


@router.delete(
    "/{persona_id}",
    operation_id="api_personas_delete",
    summary="Delete a persona",
    description="Soft-delete a persona. Editing roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_persona(
    persona: CurrentPersonaDep,
    manager: PersonaManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> None:
    manager.soft_delete(persona)


_LOCK_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


@router.post(
    "/{persona_id}/lock",
    operation_id="api_personas_lock",
    summary="Lock a persona",
    description=(
        "Freeze the persona against edits and deletion; comments, votes and child "
        "entities stay available. Owners and administrators only."
    ),
    response_model=ItemResponse[PersonaItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def lock_persona(
    entity: CurrentPersonaDep,
    user: CurrentUserDep,
    manager: PersonaManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[PersonaItem]:
    return ItemResponse(item=PersonaItem.model_validate(manager.lock(entity, user)))


@router.post(
    "/{persona_id}/unlock",
    operation_id="api_personas_unlock",
    summary="Unlock a persona",
    description="Lift the freeze on the persona. Owners and administrators only.",
    response_model=ItemResponse[PersonaItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def unlock_persona(
    entity: CurrentPersonaDep,
    manager: PersonaManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[PersonaItem]:
    return ItemResponse(item=PersonaItem.model_validate(manager.unlock(entity)))
