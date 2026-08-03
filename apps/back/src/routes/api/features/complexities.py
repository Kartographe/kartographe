# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/features/{feature_id}/complexities`.

List and give complexity estimates on a feature. Any account member may read and estimate.
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
    CurrentFeatureDep,
)

router = APIRouter(prefix="/accounts/{account_id}/features/{feature_id}/complexities", tags=["api.features.complexities"])

_UNPROCESSABLE = {422: {"model": ErrorResponse, "description": "Value is not on the account's scale"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Feature not found"}}


@router.get(
    "",
    operation_id="api_features_complexities_list",
    summary="List feature complexity estimates",
    description="List the complexity estimates on a feature, oldest first. Any member may read.",
    response_model=ListingResponse[ComplexityItem],
    responses={**_NOT_FOUND},
)
def list_feature_complexities(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    feature: CurrentFeatureDep,
    manager: ComplexityManagerDep,
) -> ListingResponse[ComplexityItem]:
    rows = manager.list_for_entity(account, EntityType.FEATURE, feature.id)
    return ListingResponse.single_page([ComplexityItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_features_complexities_create",
    summary="Estimate the complexity of a feature",
    description=(
        "Give or update your complexity estimate on a feature. Any member may estimate; "
        "a member holds at most one estimate per entity, so estimating again replaces it. "
        "The scale comes from the account's product complexity mode; a value outside it "
        "is refused."
    ),
    response_model=ItemResponse[ComplexityItem],
    responses={**_NOT_FOUND, **_UNPROCESSABLE},
)
def create_feature_complexity(
    form: ComplexityUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    feature: CurrentFeatureDep,
    manager: ComplexityManagerDep,
) -> ItemResponse[ComplexityItem]:
    complexity = manager.upsert(
        account, member, entity_type=EntityType.FEATURE, entity_id=feature.id, value=form.value
    )
    return ItemResponse(item=ComplexityItem.model_validate(complexity))


@router.delete(
    "",
    operation_id="api_features_complexities_delete",
    summary="Withdraw your estimate on a feature",
    description=(
        "Withdraw your complexity estimate on a feature. Estimating `null` says \"I cannot "
        "estimate yet\" and keeps you among the participants; withdrawing removes you from them. "
        "404 when you have not estimated it."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_NOT_FOUND},
)
def delete_feature_complexity(
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    feature: CurrentFeatureDep,
    manager: ComplexityManagerDep,
) -> None:
    manager.remove(
        account, member, entity_type=EntityType.FEATURE, entity_id=feature.id
    )
