# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/personas/{persona_id}/complexities`.

List and give complexity estimates on a persona. Any account member may read and estimate.
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
    CurrentPersonaDep,
)

router = APIRouter(prefix="/accounts/{account_id}/personas/{persona_id}/complexities", tags=["api.personas.complexities"])

_UNPROCESSABLE = {422: {"model": ErrorResponse, "description": "Value is not on the account's scale"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Persona not found"}}


@router.get(
    "",
    operation_id="api_personas_complexities_list",
    summary="List persona complexity estimates",
    description="List the complexity estimates on a persona, oldest first. Any member may read.",
    response_model=ListingResponse[ComplexityItem],
    responses={**_NOT_FOUND},
)
def list_persona_complexities(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    persona: CurrentPersonaDep,
    manager: ComplexityManagerDep,
) -> ListingResponse[ComplexityItem]:
    rows = manager.list_for_entity(account, EntityType.PERSONA, persona.id)
    return ListingResponse.single_page([ComplexityItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_personas_complexities_create",
    summary="Estimate the complexity of a persona",
    description=(
        "Give or update your complexity estimate on a persona. Any member may estimate; "
        "a member holds at most one estimate per entity, so estimating again replaces it. "
        "The scale comes from the account's product complexity mode; a value outside it "
        "is refused."
    ),
    response_model=ItemResponse[ComplexityItem],
    responses={**_NOT_FOUND, **_UNPROCESSABLE},
)
def create_persona_complexity(
    form: ComplexityUpsertForm,
    account: CurrentAccountDep,
    member: CurrentAccountUserDep,
    persona: CurrentPersonaDep,
    manager: ComplexityManagerDep,
) -> ItemResponse[ComplexityItem]:
    complexity = manager.upsert(
        account, member, entity_type=EntityType.PERSONA, entity_id=persona.id, value=form.value
    )
    return ItemResponse(item=ComplexityItem.model_validate(complexity))
