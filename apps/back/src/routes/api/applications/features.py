# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/applications/{application_id}/features`.

Links between an application and the account's features, with the version window
during which each feature is present. Reads are open to any account member;
writes are open to every contributing role (everyone except commentators).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms._bulk import BulkCreateRequest
from src.forms.applications import ApplicationFeatureCreateForm, ApplicationFeaturePatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.applications import ApplicationFeatureItem
from src.serializes.bulk import BulkCreateResponse
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
from src.utils.dependencies import (
    ApplicationFeatureManagerDep,
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentApplicationDep,
    CurrentApplicationFeatureDep,
    CurrentUserDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/applications/{application_id}/features",
    tags=["api.applications.features"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Application, feature or link not found"}}

_CONTRIBUTOR = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.PRODUCT_OWNER,
    AccountUserRole.QA_MANAGER,
    AccountUserRole.DEVELOPER,
    AccountUserRole.DATA_ANALYST,
)


@router.get(
    "",
    operation_id="api_applications_features_list",
    summary="List application features",
    description="List the features attached to an application, most recent first. Any member may read.",
    response_model=ListingResponse[ApplicationFeatureItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_application_features(
    _: CurrentAccountUserDep,
    application: CurrentApplicationDep,
    manager: ApplicationFeatureManagerDep,
) -> ListingResponse[ApplicationFeatureItem]:
    items = [ApplicationFeatureItem.model_validate(row) for row in manager.list_for_application(application)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_applications_features_create",
    summary="Attach a feature",
    description=(
        "Attach an existing account feature to the application. The feature must belong to the "
        "same account. Every contributing role may attach features."
    ),
    response_model=ItemResponse[ApplicationFeatureItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_application_feature(
    form: ApplicationFeatureCreateForm,
    account: CurrentAccountDep,
    application: CurrentApplicationDep,
    user: CurrentUserDep,
    manager: ApplicationFeatureManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> ItemResponse[ApplicationFeatureItem]:
    feature = manager.resolve_account_feature(account, form.feature_id)
    link = manager.create(application, feature, user)
    return ItemResponse(item=ApplicationFeatureItem.model_validate(link))


@router.post(
    "/bulk",
    operation_id="api_applications_features_bulk_create",
    summary="Attach several features at once",
    description=(
        "Attach 1 to 50 existing account features in a single call — prefer this over calling "
        "`api_applications_features_create` in a loop when adding many. Best-effort: each link is "
        "created independently, so one failing item does not roll back the others. Always "
        "returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the "
        "single create. Each feature must belong to the same account. Every contributing role "
        "may attach features."
    ),
    response_model=BulkCreateResponse[ApplicationFeatureItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_application_features(
    body: BulkCreateRequest[ApplicationFeatureCreateForm],
    account: CurrentAccountDep,
    application: CurrentApplicationDep,
    user: CurrentUserDep,
    manager: ApplicationFeatureManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> BulkCreateResponse[ApplicationFeatureItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            application, manager.resolve_account_feature(account, form.feature_id), user
        ),
        serialize=ApplicationFeatureItem.model_validate,
    )


@router.get(
    "/{application_feature_id}",
    operation_id="api_applications_features_get",
    summary="Get an application feature",
    description="Return a single feature link of the application. Any member may read.",
    response_model=ItemResponse[ApplicationFeatureItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_application_feature(
    _: CurrentAccountUserDep, link: CurrentApplicationFeatureDep
) -> ItemResponse[ApplicationFeatureItem]:
    return ItemResponse(item=ApplicationFeatureItem.model_validate(link))


@router.patch(
    "/{application_feature_id}",
    operation_id="api_applications_features_update",
    summary="Update an application feature",
    description=(
        "Update the feature's presence window (start/end dates and versions). Any referenced "
        "version must belong to the application. Every contributing role may edit."
    ),
    response_model=ItemResponse[ApplicationFeatureItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_application_feature(
    form: ApplicationFeaturePatchForm,
    application: CurrentApplicationDep,
    link: CurrentApplicationFeatureDep,
    manager: ApplicationFeatureManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> ItemResponse[ApplicationFeatureItem]:
    updated = manager.update(application, link, form.model_dump(exclude_unset=True))
    return ItemResponse(item=ApplicationFeatureItem.model_validate(updated))


@router.delete(
    "/{application_feature_id}",
    operation_id="api_applications_features_delete",
    summary="Detach a feature",
    description="Soft-delete a feature link. Every contributing role may detach features.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_application_feature(
    link: CurrentApplicationFeatureDep,
    manager: ApplicationFeatureManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> None:
    manager.soft_delete(link)
