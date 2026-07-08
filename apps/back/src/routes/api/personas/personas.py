"""`/v1/accounts/{account_id}/personas` — user archetypes tracked in an account.

Reads are open to any account member; writes are open to the editing roles
(owner, administrator, lead developer, product owner, QA manager, developer).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.filters._base import PageLimit, SortOrder
from src.filters.personas import PersonaSortField
from src.forms.personas import PersonaCreateForm, PersonaPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, PersonaStatus, PersonaType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.personas import PersonaItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentPersonaDep,
    PersonaManagerDep,
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
    operation_id="api.personas.list",
    summary="List personas",
    description=(
        "List the personas of the account. Filter by status and/or type (repeat the query param "
        "for multiple values), sort by date/title/status/type, and page through results. "
        "Any member may read."
    ),
    response_model=ListingResponse[PersonaItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_personas(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: PersonaManagerDep,
    persona_status: Annotated[list[PersonaStatus] | None, Query(alias="status")] = None,
    type: Annotated[list[PersonaType] | None, Query(alias="type")] = None,
    sort_by: Annotated[PersonaSortField, Query(alias="sortBy")] = PersonaSortField.DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[PageLimit, Query()] = PageLimit.L25,
) -> ListingResponse[PersonaItem]:
    rows, total = manager.list_for_account(
        account,
        statuses=persona_status,
        types=type,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit.value,
    )
    items = [PersonaItem.model_validate(row) for row in rows]
    return ListingResponse.paginate(items, count=total, page=page, limit=limit.value)


@router.post(
    "",
    operation_id="api.personas.create",
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
    persona = manager.create(account, type=form.type, title=form.title, description=form.description)
    return ItemResponse(item=PersonaItem.model_validate(persona))


@router.get(
    "/{persona_id}",
    operation_id="api.personas.get",
    summary="Get a persona",
    description="Return a single persona of the account. Any member may read.",
    response_model=ItemResponse[PersonaItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_persona(_: CurrentAccountUserDep, persona: CurrentPersonaDep) -> ItemResponse[PersonaItem]:
    return ItemResponse(item=PersonaItem.model_validate(persona))


@router.patch(
    "/{persona_id}",
    operation_id="api.personas.update",
    summary="Update a persona",
    description="Partially update a persona (type, title, description). Editing roles only.",
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


@router.post(
    "/{persona_id}/activate",
    operation_id="api.personas.activate",
    summary="Activate a persona",
    description="Set the persona status to active. Editing roles only.",
    response_model=ItemResponse[PersonaItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def activate_persona(
    persona: CurrentPersonaDep,
    manager: PersonaManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[PersonaItem]:
    updated = manager.set_status(persona, PersonaStatus.ACTIVE)
    return ItemResponse(item=PersonaItem.model_validate(updated))


@router.post(
    "/{persona_id}/archive",
    operation_id="api.personas.archive",
    summary="Archive a persona",
    description="Set the persona status to archived. Editing roles only.",
    response_model=ItemResponse[PersonaItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def archive_persona(
    persona: CurrentPersonaDep,
    manager: PersonaManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[PersonaItem]:
    updated = manager.set_status(persona, PersonaStatus.ARCHIVED)
    return ItemResponse(item=PersonaItem.model_validate(updated))


@router.delete(
    "/{persona_id}",
    operation_id="api.personas.delete",
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
