# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/journeys/{journey_id}/scenarios`.

Scenarios inside a journey. Reads are open to any account member; writes are
open to the editing roles. Personas referenced on create/update must belong to
the account. Deleting a scenario cascades a soft-delete to its steps, files and
assertions.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.filters._base import MyVoteFilter
from src.forms.journeys import JourneyScenarioCreateForm, JourneyScenarioPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.journeys import JourneyScenarioItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentJourneyDep,
    CurrentJourneyScenarioDep,
    CurrentUserDep,
    JourneyScenarioManagerDep,
    TagManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/journeys/{journey_id}/scenarios",
    tags=["api.journeys.scenarios"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Journey, scenario or persona not found"}}

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
    operation_id="api_journeys_scenarios_list",
    summary="List scenarios",
    description=(
        "List the scenarios of a journey, most recent first. Any member may read. "
        "Filter with `tagIds` (repeat the query param) to keep only the entities carrying at least one of those tags."
    ),
    response_model=ListingResponse[JourneyScenarioItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_scenarios(
    member: CurrentAccountUserDep,
    journey: CurrentJourneyDep,
    manager: JourneyScenarioManagerDep,
    tags: TagManagerDep,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
    my_vote: MyVoteFilter = None,
) -> ListingResponse[JourneyScenarioItem]:
    rows = manager.list_for_journey(journey, tag_ids=tag_ids, my_vote=my_vote, user_id=member.user_id)
    items = tags.enrich(EntityType.JOURNEY_SCENARIO, tags.attach(rows, JourneyScenarioItem), user_id=member.user_id)
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_journeys_scenarios_create",
    summary="Create a scenario",
    description=(
        "Create a scenario. It starts as a draft owned by the caller. Any referenced persona "
        "must belong to the account. Editing roles only."
    ),
    response_model=ItemResponse[JourneyScenarioItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_scenario(
    form: JourneyScenarioCreateForm,
    account: CurrentAccountDep,
    journey: CurrentJourneyDep,
    user: CurrentUserDep,
    manager: JourneyScenarioManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyScenarioItem]:
    scenario = manager.create(
        account,
        journey,
        user,
        type=form.type,
        personas_ids=form.personas_ids,
        title=form.title,
        criticity=form.criticity,
        description=form.description,
        tag_ids=form.tag_ids,
    )
    return ItemResponse(item=JourneyScenarioItem.model_validate(scenario))


@router.get(
    "/{scenario_id}",
    operation_id="api_journeys_scenarios_get",
    summary="Get a scenario",
    description="Return a single scenario of the journey. Any member may read.",
    response_model=ItemResponse[JourneyScenarioItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_scenario(
    _: CurrentAccountUserDep, scenario: CurrentJourneyScenarioDep, tags: TagManagerDep
) -> ItemResponse[JourneyScenarioItem]:
    return ItemResponse(item=tags.enrich_one(EntityType.JOURNEY_SCENARIO, tags.attach_one(scenario, JourneyScenarioItem)))


@router.patch(
    "/{scenario_id}",
    operation_id="api_journeys_scenarios_update",
    summary="Update a scenario",
    description=(
        "Partially update a scenario (type, personas, title, criticity, description, status). Any "
        "referenced persona must belong to the account. Editing roles only."
    ),
    response_model=ItemResponse[JourneyScenarioItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_scenario(
    form: JourneyScenarioPatchForm,
    account: CurrentAccountDep,
    scenario: CurrentJourneyScenarioDep,
    manager: JourneyScenarioManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyScenarioItem]:
    updated = manager.update(account, scenario, form.model_dump(exclude_unset=True))
    return ItemResponse(item=JourneyScenarioItem.model_validate(updated))


@router.delete(
    "/{scenario_id}",
    operation_id="api_journeys_scenarios_delete",
    summary="Delete a scenario",
    description=(
        "Soft-delete a scenario; its steps, files and assertions are soft-deleted as well. "
        "Editing roles only."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_scenario(
    scenario: CurrentJourneyScenarioDep,
    manager: JourneyScenarioManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> None:
    manager.soft_delete(scenario)


_LOCK_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


@router.post(
    "/{scenario_id}/lock",
    operation_id="api_journeys_scenarios_lock",
    summary="Lock a scenario",
    description=(
        "Freeze the scenario against edits and deletion; comments, votes and child "
        "entities stay available. Owners and administrators only."
    ),
    response_model=ItemResponse[JourneyScenarioItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def lock_scenario(
    entity: CurrentJourneyScenarioDep,
    user: CurrentUserDep,
    manager: JourneyScenarioManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[JourneyScenarioItem]:
    return ItemResponse(item=JourneyScenarioItem.model_validate(manager.lock(entity, user)))


@router.post(
    "/{scenario_id}/unlock",
    operation_id="api_journeys_scenarios_unlock",
    summary="Unlock a scenario",
    description="Lift the freeze on the scenario. Owners and administrators only.",
    response_model=ItemResponse[JourneyScenarioItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def unlock_scenario(
    entity: CurrentJourneyScenarioDep,
    manager: JourneyScenarioManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[JourneyScenarioItem]:
    return ItemResponse(item=JourneyScenarioItem.model_validate(manager.unlock(entity)))
