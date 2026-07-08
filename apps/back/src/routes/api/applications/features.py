"""`/v1/accounts/{account_id}/applications/{application_id}/features`.

Links between an application and the account's features, with the version window
during which each feature is present. Reads are open to any account member;
writes are open to every contributing role (everyone except commentators).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.forms.applications import ApplicationFeatureCreateForm, ApplicationFeaturePatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.applications import ApplicationFeatureItem
from src.serializes.errors import ErrorResponse
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
    operation_id="api.applications.features.list",
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
    operation_id="api.applications.features.create",
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


@router.get(
    "/{application_feature_id}",
    operation_id="api.applications.features.get",
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
    operation_id="api.applications.features.update",
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
    operation_id="api.applications.features.delete",
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
