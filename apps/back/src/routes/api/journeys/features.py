# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/journeys/{journey_id}/features` — journey ↔ feature.

The mirror of `/features/{feature_id}/journeys`: the very same `feature_journey`
rows, reached from the journey. Reads are open to any account member; writes are
open to the editing roles.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.journeys import JourneyFeatureCreateForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.errors import ErrorResponse
from src.serializes.journeys import JourneyFeatureItem
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentJourneyDep,
    CurrentJourneyFeatureDep,
    CurrentUserDep,
    FeatureJourneyManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/journeys/{journey_id}/features",
    tags=["api.journeys.features"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Journey, feature or link not found"}}

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
    operation_id="api_journeys_features_list",
    summary="List journey features",
    description="List the features linked to a journey, most recent first. Any member may read.",
    response_model=ListingResponse[JourneyFeatureItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_journey_features(
    _: CurrentAccountUserDep,
    journey: CurrentJourneyDep,
    manager: FeatureJourneyManagerDep,
) -> ListingResponse[JourneyFeatureItem]:
    items = [JourneyFeatureItem.model_validate(row) for row in manager.list_for_journey(journey)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_journeys_features_create",
    summary="Link a feature",
    description=(
        "Link an existing account feature to the journey. The feature must belong to the same "
        "account. Editing roles only."
    ),
    response_model=ItemResponse[JourneyFeatureItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_journey_feature(
    form: JourneyFeatureCreateForm,
    account: CurrentAccountDep,
    journey: CurrentJourneyDep,
    user: CurrentUserDep,
    manager: FeatureJourneyManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyFeatureItem]:
    feature = manager.resolve_account_feature(account, form.feature_id)
    link = manager.create(feature, journey, user)
    return ItemResponse(item=JourneyFeatureItem.model_validate(link))


@router.delete(
    "/{feature_journey_id}",
    operation_id="api_journeys_features_delete",
    summary="Unlink a feature",
    description="Soft-delete a feature link. Editing roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_journey_feature(
    link: CurrentJourneyFeatureDep,
    manager: FeatureJourneyManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> None:
    manager.soft_delete(link)
