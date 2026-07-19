# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/personas/{persona_id}/comments`.

List and post comments on a persona. Any account member may read and post.
"""

from fastapi import APIRouter, status

from src.forms._bulk import BulkCreateRequest
from src.forms.comments import CommentCreateForm
from src.models.enum import EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.comments import CommentItem
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    CommentManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentPersonaDep,
    CurrentUserDep,
)

router = APIRouter(
    prefix="/accounts/{account_id}/personas/{persona_id}/comments", tags=["api.personas.comments"]
)

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Persona not found"}}


@router.get(
    "",
    operation_id="api_personas_comments_list",
    summary="List persona comments",
    description="List the root comments on a persona, oldest first. Any member may read.",
    response_model=ListingResponse[CommentItem],
    responses={**_NOT_FOUND},
)
def list_persona_comments(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    persona: CurrentPersonaDep,
    manager: CommentManagerDep,
) -> ListingResponse[CommentItem]:
    rows = manager.list_for_entity(account, EntityType.PERSONA, persona.id)
    return ListingResponse.single_page([CommentItem.model_validate(row) for row in rows])


@router.post(
    "",
    operation_id="api_personas_comments_create",
    summary="Comment on a persona",
    description="Post a comment on a persona. Any member may post.",
    response_model=ItemResponse[CommentItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_persona_comment(
    form: CommentCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    persona: CurrentPersonaDep,
    manager: CommentManagerDep,
) -> ItemResponse[CommentItem]:
    comment = manager.create(
        account, user, entity_type=EntityType.PERSONA, entity_id=persona.id, value=form.value
    )
    return ItemResponse(item=CommentItem.model_validate(comment))


@router.post(
    "/bulk",
    operation_id="api_personas_comments_bulk_create",
    summary="Post several comments on a persona at once",
    description=(
        "Post 1 to 50 comments on a persona in a single call — prefer this over calling "
        "`api_personas_comments_create` in a loop. Best-effort: each comment is posted "
        "independently, so one failing item does not roll back the others. Always returns "
        "207; read each `results[].status` and the `created` / `failed` counts. Any member "
        "may post."
    ),
    response_model=BulkCreateResponse[CommentItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_NOT_FOUND},
)
def bulk_create_persona_comments(
    body: BulkCreateRequest[CommentCreateForm],
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    persona: CurrentPersonaDep,
    manager: CommentManagerDep,
) -> BulkCreateResponse[CommentItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            account, user, entity_type=EntityType.PERSONA, entity_id=persona.id, value=form.value
        ),
        serialize=CommentItem.model_validate,
    )
