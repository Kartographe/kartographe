# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/applications/{application_id}/complexities`.

List and give complexity estimates on an application. Any account member may read and estimate.
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
    CurrentApplicationDep,
)

router = APIRouter(prefix="/accounts/{account_id}/applications/{application_id}/complexities", tags=["api.applications.complexities"])

_UNPROCESSABLE = {422: {"model": ErrorResponse, "description": "Value is not on the account's scale"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Application not found"}}


@router.get(
    "",
    operation_id="api_applications_complexities_list",
    summary="List application complexity estimates",
    description="List the complexity estimates on an application, oldest first. Any member may read.",
    response_model=ListingResponse[ComplexityItem],
    responses={**_NOT_FOUND},
)
def list_application_complexities(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: ComplexityManagerDep,
) -> ListingResponse[ComplexityItem]:
    rows = manager.list_for_entity(account, EntityType.APPLICATION, application.id)
    return ListingResponse.single_page([ComplexityItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_applications_complexities_create",
    summary="Estimate the complexity of an application",
    description=(
        "Give or update your complexity estimate on an application. Any member may estimate; "
        "a member holds at most one estimate per entity, so estimating again replaces it. "
        "The scale comes from the account's technical complexity mode; a value outside it "
        "is refused."
    ),
    response_model=ItemResponse[ComplexityItem],
    responses={**_NOT_FOUND, **_UNPROCESSABLE},
)
def create_application_complexity(
    form: ComplexityUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: ComplexityManagerDep,
) -> ItemResponse[ComplexityItem]:
    complexity = manager.upsert(
        account, member, entity_type=EntityType.APPLICATION, entity_id=application.id, value=form.value
    )
    return ItemResponse(item=ComplexityItem.model_validate(complexity))
