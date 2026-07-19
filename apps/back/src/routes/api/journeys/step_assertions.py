# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../scenarios/{scenario_id}/steps/{step_id}/assertions`.

Assertions carried by a step. Reads are open to any account member; writes are
open to the editing roles. An assertion's `parameters` are validated against its
assertion type's schema.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms._bulk import BulkCreateRequest
from src.forms.journeys import (
    JourneyScenarioStepAssertionCreateForm,
    JourneyScenarioStepAssertionPatchForm,
)
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.journeys import JourneyScenarioStepAssertionItem
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentJourneyScenarioStepAssertionDep,
    CurrentJourneyScenarioStepDep,
    CurrentUserDep,
    JourneyScenarioStepAssertionManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/assertions",
    tags=["api.journeys.scenarios.steps.assertions"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Step, assertion or assertion type not found"}}
_INVALID = {422: {"model": ErrorResponse, "description": "Parameters do not match the assertion schema"}}

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
    operation_id="api_journeys_scenarios_steps_assertions_list",
    summary="List assertions",
    description="List the assertions of a step, most recent first. Any member may read.",
    response_model=ListingResponse[JourneyScenarioStepAssertionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_assertions(
    _: CurrentAccountUserDep,
    step: CurrentJourneyScenarioStepDep,
    manager: JourneyScenarioStepAssertionManagerDep,
) -> ListingResponse[JourneyScenarioStepAssertionItem]:
    items = [
        JourneyScenarioStepAssertionItem.model_validate(row) for row in manager.list_for_step(step)
    ]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_journeys_scenarios_steps_assertions_create",
    summary="Create an assertion",
    description=(
        "Attach an assertion to the step. `parameters` must match the assertion type's schema. "
        "It starts as a draft owned by the caller. Editing roles only."
    ),
    response_model=ItemResponse[JourneyScenarioStepAssertionItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND, **_INVALID},
)
def create_assertion(
    form: JourneyScenarioStepAssertionCreateForm,
    step: CurrentJourneyScenarioStepDep,
    user: CurrentUserDep,
    manager: JourneyScenarioStepAssertionManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyScenarioStepAssertionItem]:
    assertion = manager.create(
        step, user, assertion_type_id=form.assertion_type_id, parameters=form.parameters
    )
    return ItemResponse(item=JourneyScenarioStepAssertionItem.model_validate(assertion))


@router.post(
    "/bulk",
    operation_id="api_journeys_scenarios_steps_assertions_bulk_create",
    summary="Create several assertions at once",
    description=(
        "Attach 1 to 50 assertions to the step in a single call — prefer this over calling "
        "`api_journeys_scenarios_steps_assertions_create` in a loop when adding many. Best-effort: "
        "each assertion is created independently, so one failing item does not roll back the others. "
        "Always returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the "
        "single create; `parameters` must match the assertion type's schema. Editing roles only."
    ),
    response_model=BulkCreateResponse[JourneyScenarioStepAssertionItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND, **_INVALID},
)
def bulk_create_assertions(
    body: BulkCreateRequest[JourneyScenarioStepAssertionCreateForm],
    step: CurrentJourneyScenarioStepDep,
    user: CurrentUserDep,
    manager: JourneyScenarioStepAssertionManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> BulkCreateResponse[JourneyScenarioStepAssertionItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            step, user, assertion_type_id=form.assertion_type_id, parameters=form.parameters
        ),
        serialize=JourneyScenarioStepAssertionItem.model_validate,
    )


@router.get(
    "/{assertion_id}",
    operation_id="api_journeys_scenarios_steps_assertions_get",
    summary="Get an assertion",
    description="Return a single assertion of the step. Any member may read.",
    response_model=ItemResponse[JourneyScenarioStepAssertionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_assertion(
    _: CurrentAccountUserDep, assertion: CurrentJourneyScenarioStepAssertionDep
) -> ItemResponse[JourneyScenarioStepAssertionItem]:
    return ItemResponse(item=JourneyScenarioStepAssertionItem.model_validate(assertion))


@router.patch(
    "/{assertion_id}",
    operation_id="api_journeys_scenarios_steps_assertions_update",
    summary="Update an assertion",
    description=(
        "Partially update an assertion (assertion type, parameters, status). `parameters` must match the "
        "assertion type's schema. Editing roles only."
    ),
    response_model=ItemResponse[JourneyScenarioStepAssertionItem],
    responses={**_FORBIDDEN, **_NOT_FOUND, **_INVALID},
)
def update_assertion(
    form: JourneyScenarioStepAssertionPatchForm,
    assertion: CurrentJourneyScenarioStepAssertionDep,
    manager: JourneyScenarioStepAssertionManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyScenarioStepAssertionItem]:
    updated = manager.update(assertion, form.model_dump(exclude_unset=True))
    return ItemResponse(item=JourneyScenarioStepAssertionItem.model_validate(updated))


@router.delete(
    "/{assertion_id}",
    operation_id="api_journeys_scenarios_steps_assertions_delete",
    summary="Delete an assertion",
    description="Soft-delete an assertion. Editing roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_assertion(
    assertion: CurrentJourneyScenarioStepAssertionDep,
    manager: JourneyScenarioStepAssertionManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> None:
    manager.soft_delete(assertion)
