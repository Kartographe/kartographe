# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/applications/{application_id}/links`.

List and attach references on an application. Any account member may read and
attach; editing or deleting one goes through `/v1/accounts/{account_id}/links/{link_id}`.
"""

from fastapi import APIRouter, status

from src.forms._bulk import BulkCreateRequest
from src.forms.links import LinkCreateForm
from src.models.enum import EntityType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.errors import ErrorResponse
from src.serializes.links import LinkItem
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentApplicationDep,
    CurrentUserDep,
    LinkManagerDep,
)

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/links", tags=["api.applications.links"]
)

_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Application not found"}}


@router.get(
    "",
    operation_id="api_applications_links_list",
    summary="List application references",
    description=(
        "List the references attached to an application, oldest first. A reference pointing back at "
        "this Kartographe instance carries its resolved target in `meta.internal`, when the "
        "caller may see it. Any member may read."
    ),
    response_model=ListingResponse[LinkItem],
    responses={**_NOT_FOUND},
)
def list_application_links(
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: LinkManagerDep,
) -> ListingResponse[LinkItem]:
    rows = manager.list_for_entity(account, EntityType.APPLICATION, application.id)
    items = [LinkItem.model_validate(row) for row in rows]
    return ListingResponse.single_page(manager.decorate(user, items))


@router.post(
    "",
    operation_id="api_applications_links_create",
    summary="Attach a reference to an application",
    description=(
        "Attach a reference (a ticket, a document, a design, another Kartographe entity, …) to "
        "an application. Only the URL is required; call `api_links_prefill` first to propose a "
        "title. Any member may attach."
    ),
    response_model=ItemResponse[LinkItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_NOT_FOUND},
)
def create_application_link(
    form: LinkCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: LinkManagerDep,
) -> ItemResponse[LinkItem]:
    link = manager.create(
        account,
        user,
        entity_type=EntityType.APPLICATION,
        entity_id=application.id,
        url=form.url,
        type=form.type,
        title=form.title,
        description=form.description,
    )
    return ItemResponse(item=manager.decorate_one(user, LinkItem.model_validate(link)))


@router.post(
    "/bulk",
    operation_id="api_applications_links_bulk_create",
    summary="Attach several references to an application at once",
    description=(
        "Attach 1 to 50 references to an application in a single call — prefer this over calling "
        "`api_applications_links_create` in a loop. Best-effort: each reference is created "
        "independently, so one failing item does not roll back the others. Always returns 207; "
        "read each `results[].status` and the `created` / `failed` counts. Any member may attach."
    ),
    response_model=BulkCreateResponse[LinkItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_NOT_FOUND},
)
def bulk_create_application_links(
    body: BulkCreateRequest[LinkCreateForm],
    account: CurrentAccountDep,
    user: CurrentUserDep,
    _: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: LinkManagerDep,
) -> BulkCreateResponse[LinkItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            account,
            user,
            entity_type=EntityType.APPLICATION,
            entity_id=application.id,
            url=form.url,
            type=form.type,
            title=form.title,
            description=form.description,
        ),
        serialize=lambda link: manager.decorate_one(user, LinkItem.model_validate(link)),
    )
