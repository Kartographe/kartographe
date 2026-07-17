# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/features/{feature_id}/journeys` — feature ↔ journey.

Links between a feature and the account's journeys. Reads are open to any account
member; writes are open to the editing roles.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.journeys import FeatureJourneyCreateForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.journeys import FeatureJourneyItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentFeatureDep,
    CurrentFeatureJourneyDep,
    CurrentUserDep,
    FeatureJourneyManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/features/{feature_id}/journeys",
    tags=["api.features.journeys"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Feature, journey or link not found"}}

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
    operation_id="api_features_journeys_list",
    summary="List feature journeys",
    description="List the journeys linked to a feature, most recent first. Any member may read.",
    response_model=ListingResponse[FeatureJourneyItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_feature_journeys(
    _: CurrentAccountUserDep,
    feature: CurrentFeatureDep,
    manager: FeatureJourneyManagerDep,
) -> ListingResponse[FeatureJourneyItem]:
    items = [FeatureJourneyItem.model_validate(row) for row in manager.list_for_feature(feature)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_features_journeys_create",
    summary="Link a journey",
    description=(
        "Link an existing account journey to the feature. The journey must belong to the same "
        "account. Editing roles only."
    ),
    response_model=ItemResponse[FeatureJourneyItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_feature_journey(
    form: FeatureJourneyCreateForm,
    account: CurrentAccountDep,
    feature: CurrentFeatureDep,
    user: CurrentUserDep,
    manager: FeatureJourneyManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[FeatureJourneyItem]:
    journey = manager.resolve_account_journey(account, form.journey_id)
    link = manager.create(feature, journey, user)
    return ItemResponse(item=FeatureJourneyItem.model_validate(link))


@router.get(
    "/{feature_journey_id}",
    operation_id="api_features_journeys_get",
    summary="Get a feature journey",
    description="Return a single journey link of the feature. Any member may read.",
    response_model=ItemResponse[FeatureJourneyItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_feature_journey(
    _: CurrentAccountUserDep, link: CurrentFeatureJourneyDep
) -> ItemResponse[FeatureJourneyItem]:
    return ItemResponse(item=FeatureJourneyItem.model_validate(link))


@router.delete(
    "/{feature_journey_id}",
    operation_id="api_features_journeys_delete",
    summary="Unlink a journey",
    description="Soft-delete a journey link. Editing roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_feature_journey(
    link: CurrentFeatureJourneyDep,
    manager: FeatureJourneyManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> None:
    manager.soft_delete(link)
