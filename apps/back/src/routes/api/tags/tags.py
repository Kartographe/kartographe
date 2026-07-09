"""`/v1/accounts/{account_id}/tags` — colored labels for account entities.

Reads and tag creation are open to any account member — tagging is part of
filling in an entity, and the entity forms create the missing tag on the spot.
Editing and deleting stay restricted to owners and administrators, since both
reach across every entity that carries the tag.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.forms.tags import TagCreateForm, TagPatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, TagEntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.tags import TagItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentTagDep,
    TagManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(prefix="/accounts/{account_id}/tags", tags=["api.tags"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account or tag not found"}}

_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


@router.get(
    "",
    operation_id="api.tags.list",
    summary="List tags",
    description="List the tags of the account, optionally filtered by entity type. Any member may read.",
    response_model=ListingResponse[TagItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_tags(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: TagManagerDep,
    entity_type: Annotated[TagEntityType | None, Query(alias="type")] = None,
) -> ListingResponse[TagItem]:
    items = [TagItem.model_validate(row) for row in manager.list_for_account(account, entity_type=entity_type)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api.tags.create",
    summary="Create a tag",
    description="Create a tag for a given entity type. Any member may create.",
    response_model=ItemResponse[TagItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_tag(
    form: TagCreateForm,
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: TagManagerDep,
) -> ItemResponse[TagItem]:
    tag = manager.create(
        account,
        entity_type=form.entity_type,
        label=form.label,
        background_color=form.background_color,
        text_color=form.text_color,
    )
    return ItemResponse(item=TagItem.model_validate(tag))


@router.get(
    "/{tag_id}",
    operation_id="api.tags.get",
    summary="Get a tag",
    description="Return a single tag of the account. Any member may read.",
    response_model=ItemResponse[TagItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_tag(_: CurrentAccountUserDep, tag: CurrentTagDep) -> ItemResponse[TagItem]:
    return ItemResponse(item=TagItem.model_validate(tag))


@router.patch(
    "/{tag_id}",
    operation_id="api.tags.update",
    summary="Update a tag",
    description="Partially update a tag (label, colors). Owners and administrators only.",
    response_model=ItemResponse[TagItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_tag(
    form: TagPatchForm,
    tag: CurrentTagDep,
    manager: TagManagerDep,
    _: Annotated[AccountUser, Depends(_ADMIN)],
) -> ItemResponse[TagItem]:
    updated = manager.apply_update(tag, form.model_dump(exclude_unset=True))
    return ItemResponse(item=TagItem.model_validate(updated))


@router.delete(
    "/{tag_id}",
    operation_id="api.tags.delete",
    summary="Delete a tag",
    description="Soft-delete a tag and detach it from every entity that carried it. Owners and administrators only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_tag(
    tag: CurrentTagDep,
    manager: TagManagerDep,
    _: Annotated[AccountUser, Depends(_ADMIN)],
) -> None:
    manager.soft_delete(tag)
