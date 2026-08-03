# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/applications/{application_id}/routes/{route_id}/complexities`.

List and give complexity estimates on a application route. Any account member may read and estimate.
"""

from fastapi import APIRouter, status

from src.forms.complexities import ComplexityUpsertForm
from src.models.enum import EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.complexities import ComplexityItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    ComplexityManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentApplicationRouteDep,
)

router = APIRouter(prefix="/accounts/{account_id}/applications/{application_id}/routes/{route_id}/complexities", tags=["api.applications.routes.complexities"])

_UNPROCESSABLE = {422: {"model": ErrorResponse, "description": "Value is not on the account's scale"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Application or route not found"}}


@router.get(
    "",
    operation_id="api_applications_routes_complexities_list",
    summary="List route complexity estimates",
    description="List the complexity estimates on a application route, oldest first. Any member may read.",
    response_model=ListingResponse[ComplexityItem],
    responses={**_NOT_FOUND},
)
def list_route_complexities(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    route: CurrentApplicationRouteDep,
    manager: ComplexityManagerDep,
) -> ListingResponse[ComplexityItem]:
    rows = manager.list_for_entity(account, EntityType.APPLICATION_ROUTE, route.id)
    return ListingResponse.single_page([ComplexityItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_applications_routes_complexities_create",
    summary="Estimate the complexity of a route",
    description=(
        "Give or update your complexity estimate on a application route. Any member may estimate; "
        "a member holds at most one estimate per entity, so estimating again replaces it. "
        "The scale comes from the account's technical complexity mode; a value outside it "
        "is refused."
    ),
    response_model=ItemResponse[ComplexityItem],
    responses={**_NOT_FOUND, **_UNPROCESSABLE},
)
def create_route_complexity(
    form: ComplexityUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    route: CurrentApplicationRouteDep,
    manager: ComplexityManagerDep,
) -> ItemResponse[ComplexityItem]:
    complexity = manager.upsert(
        account, member, entity_type=EntityType.APPLICATION_ROUTE, entity_id=route.id, value=form.value
    )
    return ItemResponse(item=ComplexityItem.model_validate(complexity))


@router.delete(
    "",
    operation_id="api_applications_routes_complexities_delete",
    summary="Withdraw your estimate on a route",
    description=(
        "Withdraw your complexity estimate on a route. Estimating `null` says \"I cannot "
        "estimate yet\" and keeps you among the participants; withdrawing removes you from them. "
        "404 when you have not estimated it."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_NOT_FOUND},
)
def delete_route_complexity(
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    route: CurrentApplicationRouteDep,
    manager: ComplexityManagerDep,
) -> None:
    manager.remove(
        account, member, entity_type=EntityType.APPLICATION_ROUTE, entity_id=route.id
    )
