# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/core/assertionTypes` — global catalogue of step assertions (read-only).

Reference data shared by every account; any authenticated user may read it.
"""

from fastapi import APIRouter

from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.core import AssertionTypeItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import CoreManagerDep, CurrentAssertionTypeDep, CurrentUserDep

router = APIRouter(prefix="/core/assertionTypes", tags=["api.core.assertionTypes"])

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Assertion type not found"}}


@router.get(
    "",
    operation_id="api.core.assertionTypes.list",
    summary="List assertion types",
    description="List every available step assertion and the shape of its parameters.",
    response_model=ListingResponse[AssertionTypeItem],
)
def list_assertion_types(
    _: CurrentUserDep, manager: CoreManagerDep
) -> ListingResponse[AssertionTypeItem]:
    items = [AssertionTypeItem.model_validate(row) for row in manager.list_assertion_types()]
    return ListingResponse.single_page(items)


@router.get(
    "/{assertion_type_id}",
    operation_id="api.core.assertionTypes.get",
    summary="Get an assertion type",
    description="Return a single assertion type and the shape of its parameters.",
    response_model=ItemResponse[AssertionTypeItem],
    responses={**_NOT_FOUND},
)
def get_assertion_type(
    _: CurrentUserDep, assertion_type: CurrentAssertionTypeDep
) -> ItemResponse[AssertionTypeItem]:
    return ItemResponse(item=AssertionTypeItem.model_validate(assertion_type))
