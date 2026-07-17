# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/core/actionTypes` — global catalogue of step actions (read-only).

Reference data shared by every account; any authenticated user may read it.
"""

from fastapi import APIRouter

from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.core import ActionTypeItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import CoreManagerDep, CurrentActionTypeDep, CurrentUserDep

router = APIRouter(prefix="/core/actionTypes", tags=["api.core.actionTypes"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Action type not found"}}


@router.get(
    "",
    operation_id="api_core_actionTypes_list",
    summary="List action types",
    description="List every available step action and the shape of its parameters.",
    response_model=ListingResponse[ActionTypeItem],
)
def list_action_types(_: CurrentUserDep, manager: CoreManagerDep) -> ListingResponse[ActionTypeItem]:
    items = [ActionTypeItem.model_validate(row) for row in manager.list_action_types()]
    return ListingResponse.single_page(items)


@router.get(
    "/{action_type_id}",
    operation_id="api_core_actionTypes_get",
    summary="Get an action type",
    description="Return a single action type and the shape of its parameters.",
    response_model=ItemResponse[ActionTypeItem],
    responses={**_NOT_FOUND},
)
def get_action_type(_: CurrentUserDep, action_type: CurrentActionTypeDep) -> ItemResponse[ActionTypeItem]:
    return ItemResponse(item=ActionTypeItem.model_validate(action_type))
