# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/journeys` — user journeys (parcours).

Reads are open to any account member; writes are open to the editing roles.
Personas referenced on create/update must belong to the account. Deleting a
journey cascades a soft-delete to its scenarios, steps, files, assertions and
feature links.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.filters._base import PageLimit, SortOrder
from src.filters.journeys import JourneySortField
from src.forms.journeys import JourneyCreateForm, JourneyPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, JourneyStatus, JourneyType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.journeys import JourneyItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentJourneyDep,
    CurrentUserDep,
    JourneyManagerDep,
    TagManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(prefix="/accounts/{account_id}/journeys", tags=["api.journeys"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account, journey or persona not found"}}

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
    operation_id="api.journeys.list",
    summary="List journeys",
    description=(
        "List the journeys of the account. Filter by status and/or type (repeat the query param "
        "for multiple values), sort by date/title/status/type, and page through results. "
        "Any member may read. "
        "Filter with `tagIds` (repeat the query param) to keep only the entities carrying at least one of those tags. "
        "Filter with `personasIds` (repeat the query param) to keep only the journeys targeting at least one of those personas. "
    ),
    response_model=ListingResponse[JourneyItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_journeys(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: JourneyManagerDep,
    tags: TagManagerDep,
    journey_status: Annotated[list[JourneyStatus] | None, Query(alias="status")] = None,
    type: Annotated[list[JourneyType] | None, Query(alias="type")] = None,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
    persona_ids: Annotated[list[uuid.UUID] | None, Query(alias="personasIds")] = None,
    sort_by: Annotated[JourneySortField, Query(alias="sortBy")] = JourneySortField.DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[PageLimit, Query()] = PageLimit.L25,
) -> ListingResponse[JourneyItem]:
    rows, total = manager.list_for_account(
        account,
        statuses=journey_status,
        types=type,
        tag_ids=tag_ids,
        persona_ids=persona_ids,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit.value,
    )
    items = tags.attach(rows, JourneyItem)
    return ListingResponse.paginate(items, count=total, page=page, limit=limit.value)


@router.post(
    "",
    operation_id="api.journeys.create",
    summary="Create a journey",
    description=(
        "Create a journey. It starts as a draft owned by the caller. Any referenced persona "
        "must belong to the account. Editing roles only."
    ),
    response_model=ItemResponse[JourneyItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_journey(
    form: JourneyCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    manager: JourneyManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyItem]:
    journey = manager.create(
        account,
        user,
        type=form.type,
        title=form.title,
        description=form.description,
        personas_ids=form.personas_ids,
        tag_ids=form.tag_ids,
    )
    return ItemResponse(item=JourneyItem.model_validate(journey))


@router.get(
    "/{journey_id}",
    operation_id="api.journeys.get",
    summary="Get a journey",
    description="Return a single journey of the account. Any member may read.",
    response_model=ItemResponse[JourneyItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_journey(
    _: CurrentAccountUserDep, journey: CurrentJourneyDep, tags: TagManagerDep
) -> ItemResponse[JourneyItem]:
    return ItemResponse(item=tags.attach_one(journey, JourneyItem))


@router.patch(
    "/{journey_id}",
    operation_id="api.journeys.update",
    summary="Update a journey",
    description=(
        "Partially update a journey (type, title, description, personas). Any referenced persona "
        "must belong to the account. Editing roles only."
    ),
    response_model=ItemResponse[JourneyItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_journey(
    form: JourneyPatchForm,
    account: CurrentAccountDep,
    journey: CurrentJourneyDep,
    manager: JourneyManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyItem]:
    updated = manager.update(account, journey, form.model_dump(exclude_unset=True))
    return ItemResponse(item=JourneyItem.model_validate(updated))


@router.post(
    "/{journey_id}/activate",
    operation_id="api.journeys.activate",
    summary="Activate a journey",
    description="Set the journey status to active. Editing roles only.",
    response_model=ItemResponse[JourneyItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def activate_journey(
    journey: CurrentJourneyDep,
    manager: JourneyManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyItem]:
    updated = manager.set_status(journey, JourneyStatus.ACTIVE)
    return ItemResponse(item=JourneyItem.model_validate(updated))


@router.post(
    "/{journey_id}/archive",
    operation_id="api.journeys.archive",
    summary="Archive a journey",
    description="Set the journey status to archived. Editing roles only.",
    response_model=ItemResponse[JourneyItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def archive_journey(
    journey: CurrentJourneyDep,
    manager: JourneyManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyItem]:
    updated = manager.set_status(journey, JourneyStatus.ARCHIVED)
    return ItemResponse(item=JourneyItem.model_validate(updated))


@router.delete(
    "/{journey_id}",
    operation_id="api.journeys.delete",
    summary="Delete a journey",
    description=(
        "Soft-delete a journey; its scenarios, steps, files, assertions and feature links are "
        "soft-deleted as well. Editing roles only."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_journey(
    journey: CurrentJourneyDep,
    manager: JourneyManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> None:
    manager.soft_delete(journey)
