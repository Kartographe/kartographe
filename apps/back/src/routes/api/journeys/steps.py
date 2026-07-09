"""`.../journeys/{journey_id}/scenarios/{scenario_id}/steps`.

Steps inside a scenario (a tree via `parentId`). Reads are open to any account
member; writes are open to the editing roles. A step's `parameters` are
validated against its action type's schema. Deleting a step soft-deletes its
whole subtree plus attached files and assertions.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.forms.journeys import JourneyScenarioStepCreateForm, JourneyScenarioStepPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.journeys import JourneyScenarioStepItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentJourneyScenarioDep,
    CurrentJourneyScenarioStepDep,
    JourneyScenarioStepManagerDep,
    TagManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps",
    tags=["api.journeys.scenarios.steps"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Scenario, step or action type not found"}}
_INVALID = {422: {"model": ErrorResponse, "description": "Parameters do not match the action schema"}}

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
    operation_id="api.journeys.scenarios.steps.list",
    summary="List steps",
    description=(
        "List the steps of a scenario, in insertion order. Any member may read. "
        "Filter with `tagIds` (repeat the query param) to keep only the entities carrying at least one of those tags."
    ),
    response_model=ListingResponse[JourneyScenarioStepItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_steps(
    _: CurrentAccountUserDep,
    scenario: CurrentJourneyScenarioDep,
    manager: JourneyScenarioStepManagerDep,
    tags: TagManagerDep,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
) -> ListingResponse[JourneyScenarioStepItem]:
    rows = manager.list_for_scenario(scenario, tag_ids=tag_ids)
    items = tags.attach(rows, JourneyScenarioStepItem)
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api.journeys.scenarios.steps.create",
    summary="Create a step",
    description=(
        "Insert a step in the scenario. A parent step (if any) must belong to the same scenario, "
        "and `parameters` must match the action type's schema. The step is inserted rather than "
        "appended: whatever already hung under the same parent is re-parented onto the new step, "
        "so it lands right after its parent (or at the head of the scenario when no parent is "
        "given). Editing roles only."
    ),
    response_model=ItemResponse[JourneyScenarioStepItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND, **_INVALID},
)
def create_step(
    form: JourneyScenarioStepCreateForm,
    scenario: CurrentJourneyScenarioDep,
    manager: JourneyScenarioStepManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyScenarioStepItem]:
    step = manager.create(
        scenario,
        parent_journey_scenario_step_id=form.parent_journey_scenario_step_id,
        title=form.title,
        description=form.description,
        action_type_id=form.action_type_id,
        optional=form.optional,
        parameters=form.parameters,
        tag_ids=form.tag_ids,
    )
    return ItemResponse(item=JourneyScenarioStepItem.model_validate(step))


@router.get(
    "/{step_id}",
    operation_id="api.journeys.scenarios.steps.get",
    summary="Get a step",
    description="Return a single step of the scenario. Any member may read.",
    response_model=ItemResponse[JourneyScenarioStepItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_step(
    _: CurrentAccountUserDep, step: CurrentJourneyScenarioStepDep, tags: TagManagerDep
) -> ItemResponse[JourneyScenarioStepItem]:
    return ItemResponse(item=tags.attach_one(step, JourneyScenarioStepItem))


@router.patch(
    "/{step_id}",
    operation_id="api.journeys.scenarios.steps.update",
    summary="Update a step",
    description=(
        "Partially update a step (parent, title, description, action, optional, parameters). "
        "`parameters` must match the action type's schema. Editing roles only."
    ),
    response_model=ItemResponse[JourneyScenarioStepItem],
    responses={**_FORBIDDEN, **_NOT_FOUND, **_INVALID},
)
def update_step(
    form: JourneyScenarioStepPatchForm,
    scenario: CurrentJourneyScenarioDep,
    step: CurrentJourneyScenarioStepDep,
    manager: JourneyScenarioStepManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyScenarioStepItem]:
    updated = manager.update(scenario, step, form.model_dump(exclude_unset=True))
    return ItemResponse(item=JourneyScenarioStepItem.model_validate(updated))


@router.delete(
    "/{step_id}",
    operation_id="api.journeys.scenarios.steps.delete",
    summary="Delete a step",
    description=(
        "Soft-delete a step and its whole subtree (descendant steps, files and assertions). "
        "Editing roles only."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_step(
    step: CurrentJourneyScenarioStepDep,
    manager: JourneyScenarioStepManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> None:
    manager.soft_delete(step)
