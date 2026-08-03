# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/services/{service_id}/complexities`.

List and give complexity estimates on a service. Any account member may read and estimate.
"""

from fastapi import APIRouter

from src.forms.complexities import ComplexityUpsertForm
from src.models.enum import EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.complexities import ComplexityItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    ComplexityManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentServiceDep,
)

router = APIRouter(prefix="/accounts/{account_id}/services/{service_id}/complexities", tags=["api.services.complexities"])

_UNPROCESSABLE = {422: {"model": ErrorResponse, "description": "Value is not on the account's scale"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Service not found"}}


@router.get(
    "",
    operation_id="api_services_complexities_list",
    summary="List service complexity estimates",
    description="List the complexity estimates on a service, oldest first. Any member may read.",
    response_model=ListingResponse[ComplexityItem],
    responses={**_NOT_FOUND},
)
def list_service_complexities(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    service: CurrentServiceDep,
    manager: ComplexityManagerDep,
) -> ListingResponse[ComplexityItem]:
    rows = manager.list_for_entity(account, EntityType.SERVICE, service.id)
    return ListingResponse.single_page([ComplexityItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_services_complexities_create",
    summary="Estimate the complexity of a service",
    description=(
        "Give or update your complexity estimate on a service. Any member may estimate; "
        "a member holds at most one estimate per entity, so estimating again replaces it. "
        "The scale comes from the account's technical complexity mode; a value outside it "
        "is refused."
    ),
    response_model=ItemResponse[ComplexityItem],
    responses={**_NOT_FOUND, **_UNPROCESSABLE},
)
def create_service_complexity(
    form: ComplexityUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    service: CurrentServiceDep,
    manager: ComplexityManagerDep,
) -> ItemResponse[ComplexityItem]:
    complexity = manager.upsert(
        account, member, entity_type=EntityType.SERVICE, entity_id=service.id, value=form.value
    )
    return ItemResponse(item=ComplexityItem.model_validate(complexity))
