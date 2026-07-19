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

from src.forms._bulk import BulkCreateRequest
from src.forms.journeys import JourneyScenarioStepRouteCreateForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.journeys import JourneyScenarioStepRouteItem
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
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


@router.post(
    "/bulk",
    operation_id="api_journeys_scenarios_steps_routes_bulk_create",
    summary="Link several application routes at once",
    description=(
        "Link 1 to 50 application routes to the step in a single call — prefer this over calling "
        "`api_journeys_scenarios_steps_routes_create` in a loop when adding many. Best-effort: each "
        "link is created independently, so one failing item does not roll back the others. Always "
        "returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the "
        "single create; the application must belong to the account and the route to that "
        "application. Dev roles only."
    ),
    response_model=BulkCreateResponse[JourneyScenarioStepRouteItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_step_routes(
    body: BulkCreateRequest[JourneyScenarioStepRouteCreateForm],
    step: CurrentJourneyScenarioStepDep,
    user: CurrentUserDep,
    manager: JourneyScenarioStepRouteManagerDep,
    _: Annotated[AccountUser, Depends(_DEV)],
) -> BulkCreateResponse[JourneyScenarioStepRouteItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            step, user, manager.resolve_route(step, form.application_id, form.application_route_id)
        ),
        serialize=JourneyScenarioStepRouteItem.model_validate,
    )


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
