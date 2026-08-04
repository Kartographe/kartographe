# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/links` — account-wide reference management.

Any member may read the account's references and attach one to any entity
through the mutualized `POST` (the target is a `(entityType, entityId)` pair,
validated against the account); editing or deleting one is restricted to its
author or an owner/administrator. The per-entity endpoints
(`.../{entity}/links`) remain.
"""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from src.filters._base import SortOrder
from src.filters.links import LinkSortField
from src.forms._bulk import BulkCreateRequest
from src.forms.links import LinkAttachForm, LinkPatchForm, LinkPrefillForm
from src.models.enum import EntityType, LinkType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.errors import ErrorResponse
from src.serializes.links import LinkItem, LinkListItem, LinkPrefillItem
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentLinkDep,
    CurrentUserDep,
    LinkManagerDep,
    ModifiableLinkDep,
)

router = APIRouter(prefix="/accounts/{account_id}/links", tags=["api.links"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this link"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account, entity or link not found"}}

_INTERNAL_NOTE = (
    "A reference whose URL points back at this Kartographe instance carries a resolved "
    "`meta.internal` block — the target entity (type, id, label and its containing entities) "
    "plus the in-app `path`. It is filled only when the caller is a member of the account that "
    "owns the target; otherwise the reference stays a plain URL."
)


@router.get(
    "",
    operation_id="api_links_list",
    summary="List references",
    description=(
        "List the references of the account, most recent first. Filter by entity type, entity id, "
        "owner and/or kind (repeat the query param for multiple values), restrict to a date range "
        "with `lbound` / `ubound` (inclusive bounds on the reference's date, ISO-8601), and sort "
        "by date/title/type. Each reference carries its resolved `entity` — the entity it is "
        "attached to, with its containing entities in `parents` (null when that entity has since "
        f"been deleted). {_INTERNAL_NOTE} Any member may read."
    ),
    response_model=ListingResponse[LinkListItem],
    responses={**_NOT_FOUND},
)
def list_links(
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    manager: LinkManagerDep,
    entity_type: Annotated[list[EntityType] | None, Query(alias="entityType")] = None,
    entity_id: Annotated[list[uuid.UUID] | None, Query(alias="entityId")] = None,
    owner_id: Annotated[list[uuid.UUID] | None, Query(alias="ownerId")] = None,
    link_type: Annotated[list[LinkType] | None, Query(alias="type")] = None,
    lbound: Annotated[datetime | None, Query()] = None,
    ubound: Annotated[datetime | None, Query()] = None,
    sort_by: Annotated[LinkSortField, Query(alias="sortBy")] = LinkSortField.DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
) -> ListingResponse[LinkListItem]:
    rows = manager.list_for_account(
        account,
        entity_types=entity_type,
        entity_ids=entity_id,
        owner_ids=owner_id,
        types=link_type,
        lbound=lbound,
        ubound=ubound,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    entities = manager.resolve_entities(account, rows)
    items = [
        LinkListItem.model_validate(row).model_copy(
            update={"entity": entities.get((row.entity_type, row.entity_id))}
        )
        for row in rows
    ]
    return ListingResponse.single_page(manager.decorate(user, items))


@router.post(
    "",
    operation_id="api_links_create",
    summary="Attach a reference to an entity",
    description=(
        "Attach a reference (a ticket, a document, a design, another Kartographe entity, …) to "
        "any entity of the account, given its `entityType` and `entityId`. Only the URL is "
        "required; call `api_links_prefill` first to propose a title. Any member may attach. "
        "The mutualized counterpart of the per-entity `.../{entity}/links` endpoints."
    ),
    response_model=ItemResponse[LinkItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_link(
    form: LinkAttachForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    manager: LinkManagerDep,
) -> ItemResponse[LinkItem]:
    if not manager.entity_exists(account, form.entity_type, form.entity_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entity not found.")
    link = manager.create(
        account,
        user,
        entity_type=form.entity_type,
        entity_id=form.entity_id,
        url=form.url,
        type=form.type,
        title=form.title,
        description=form.description,
    )
    item = manager.decorate_one(user, LinkItem.model_validate(link))
    return ItemResponse(item=item)


@router.post(
    "/bulk",
    operation_id="api_links_bulk_create",
    summary="Attach several references at once",
    description=(
        "Attach 1 to 50 references in a single call — prefer this over calling `api_links_create` "
        "in a loop. Each item names its own target, so one call can reference several entities. "
        "Best-effort: each reference is created independently, so one failing item does not roll "
        "back the others. Always returns 207; read each `results[].status` and the `created` / "
        "`failed` counts. Any member may attach."
    ),
    response_model=BulkCreateResponse[LinkItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_NOT_FOUND},
)
def bulk_create_links(
    body: BulkCreateRequest[LinkAttachForm],
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    manager: LinkManagerDep,
) -> BulkCreateResponse[LinkItem]:
    def create_one(form: LinkAttachForm):
        if not manager.entity_exists(account, form.entity_type, form.entity_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Entity not found.")
        return manager.create(
            account,
            user,
            entity_type=form.entity_type,
            entity_id=form.entity_id,
            url=form.url,
            type=form.type,
            title=form.title,
            description=form.description,
        )

    return bulk_create(
        manager.session,
        body.items,
        create_one=create_one,
        serialize=lambda link: manager.decorate_one(user, LinkItem.model_validate(link)),
    )


@router.post(
    "/prefill",
    operation_id="api_links_prefill",
    summary="Preview a URL before attaching it",
    description=(
        "Read a URL and propose what to save with it: the target page's `<title>` (or its "
        "`og:title`) and a suggested `type`. A URL on this Kartographe instance is answered from "
        "the database — the entity's label as the title, `kartographe` as the type, and the "
        "resolved entity in `meta.internal` — with no outbound request. Any other URL is fetched "
        "server-side, once, with a short timeout: private and loopback addresses are refused, and "
        "a page that cannot be read simply comes back with a null `title` rather than an error. "
        "Nothing is stored; feed the result to `api_links_create`. Any member may call it."
    ),
    response_model=ItemResponse[LinkPrefillItem],
    responses={**_NOT_FOUND},
)
def prefill_link(
    form: LinkPrefillForm,
    _account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    manager: LinkManagerDep,
) -> ItemResponse[LinkPrefillItem]:
    title, link_type, meta = manager.prefill(user, form.url)
    return ItemResponse(
        item=LinkPrefillItem(url=form.url, title=title, type=link_type, meta=meta)
    )


@router.get(
    "/{link_id}",
    operation_id="api_links_get",
    summary="Get a reference",
    description=f"Return a single reference of the account. {_INTERNAL_NOTE} Any member may read.",
    response_model=ItemResponse[LinkItem],
    responses={**_NOT_FOUND},
)
def get_link(
    _: CurrentAccountUserDep,
    user: CurrentUserDep,
    link: CurrentLinkDep,
    manager: LinkManagerDep,
) -> ItemResponse[LinkItem]:
    return ItemResponse(item=manager.decorate_one(user, LinkItem.model_validate(link)))


@router.patch(
    "/{link_id}",
    operation_id="api_links_update",
    summary="Edit a reference",
    description=(
        "Partial update of a reference — only the keys sent are applied; `title` and "
        "`description` accept `null` to clear them. The entity it is attached to cannot be "
        "changed: detach and attach again. The author or an owner/administrator only."
    ),
    response_model=ItemResponse[LinkItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_link(
    form: LinkPatchForm,
    link: ModifiableLinkDep,
    user: CurrentUserDep,
    manager: LinkManagerDep,
) -> ItemResponse[LinkItem]:
    updated = manager.update(link, form.model_dump(exclude_unset=True))
    return ItemResponse(item=manager.decorate_one(user, LinkItem.model_validate(updated)))


@router.delete(
    "/{link_id}",
    operation_id="api_links_delete",
    summary="Delete a reference",
    description="Soft-delete a reference. The author or an owner/administrator only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_link(link: ModifiableLinkDep, manager: LinkManagerDep) -> None:
    manager.soft_delete(link)
