# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`.../scenarios/{scenario_id}/steps/{step_id}/routes`.

Links between a scenario step and the application routes it exercises. Reads are
open to any account member; writes are restricted to the dev roles. The linked
route's application must belong to the account.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.journeys import JourneyScenarioStepRouteCreateForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.journeys import JourneyScenarioStepRouteItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentJourneyScenarioStepDep,
    CurrentJourneyScenarioStepRouteDep,
    CurrentUserDep,
    JourneyScenarioStepRouteManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/routes",
    tags=["api.journeys.scenarios.steps.routes"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Step, link, application or route not found"}}

_DEV = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.DEVELOPER,
)


@router.get(
    "",
    operation_id="api_journeys_scenarios_steps_routes_list",
    summary="List step routes",
    description="List the application routes linked to a step, most recent first. Any member may read.",
    response_model=ListingResponse[JourneyScenarioStepRouteItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_step_routes(
    _: CurrentAccountUserDep,
    step: CurrentJourneyScenarioStepDep,
    manager: JourneyScenarioStepRouteManagerDep,
) -> ListingResponse[JourneyScenarioStepRouteItem]:
    items = [JourneyScenarioStepRouteItem.model_validate(row) for row in manager.list_for_step(step)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_journeys_scenarios_steps_routes_create",
    summary="Link an application route",
    description=(
        "Link the step to an application route. The application must belong to the account and "
        "the route to that application. Dev roles only."
    ),
    response_model=ItemResponse[JourneyScenarioStepRouteItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_step_route(
    form: JourneyScenarioStepRouteCreateForm,
    step: CurrentJourneyScenarioStepDep,
    user: CurrentUserDep,
    manager: JourneyScenarioStepRouteManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> ItemResponse[JourneyScenarioStepRouteItem]:
    route = manager.resolve_route(step, form.application_id, form.application_route_id)
    link = manager.create(step, user, route)
    return ItemResponse(item=JourneyScenarioStepRouteItem.model_validate(link))


@router.get(
    "/{step_route_id}",
    operation_id="api_journeys_scenarios_steps_routes_get",
    summary="Get a step route",
    description="Return a single route link of the step. Any member may read.",
    response_model=ItemResponse[JourneyScenarioStepRouteItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_step_route(
    _: CurrentAccountUserDep, link: CurrentJourneyScenarioStepRouteDep
) -> ItemResponse[JourneyScenarioStepRouteItem]:
    return ItemResponse(item=JourneyScenarioStepRouteItem.model_validate(link))


@router.delete(
    "/{step_route_id}",
    operation_id="api_journeys_scenarios_steps_routes_delete",
    summary="Unlink an application route",
    description="Soft-delete a route link. Dev roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_step_route(
    link: CurrentJourneyScenarioStepRouteDep,
    manager: JourneyScenarioStepRouteManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> None:
    manager.soft_delete(link)
