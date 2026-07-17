# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/features/{feature_id}/files` — feature attachments.

Reads are open to any account member; writes are open to every contributing
role (everyone except commentators). The single-file read includes a
time-limited `downloadUrl`; the listing omits it.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile, status

from src.forms.features import FeatureFilePatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, FeatureFileStatus
from src.models.feature_file import FeatureFile
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.features import FeatureFileItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentFeatureDep,
    CurrentFeatureFileDep,
    CurrentUserDep,
    FeatureFileManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/features/{feature_id}/files", tags=["api.features.files"]
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Feature or file not found"}}

_CONTRIBUTOR = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.PRODUCT_OWNER,
    AccountUserRole.QA_MANAGER,
    AccountUserRole.DEVELOPER,
    AccountUserRole.DATA_ANALYST,
)


def _file_item(feature_file: FeatureFile, *, download_url: str | None = None) -> FeatureFileItem:
    item = FeatureFileItem.model_validate(feature_file)
    item.download_url = download_url
    return item


@router.get(
    "",
    operation_id="api_features_files_list",
    summary="List feature files",
    description="List the files attached to a feature, most recent first. Any member may read.",
    response_model=ListingResponse[FeatureFileItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_files(
    _: CurrentAccountUserDep,
    feature: CurrentFeatureDep,
    manager: FeatureFileManagerDep,
) -> ListingResponse[FeatureFileItem]:
    items = [FeatureFileItem.model_validate(row) for row in manager.list_for_feature(feature)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api_features_files_create",
    summary="Upload a feature file",
    description=(
        "Upload a file (multipart, field `file`) and attach it to the feature. "
        "Every contributing role may upload files."
    ),
    response_model=ItemResponse[FeatureFileItem],
    status_code=status.HTTP_201_CREATED,
    responses={
        **_FORBIDDEN,
        **_NOT_FOUND,
        400: {"model": ErrorResponse, "description": "The uploaded file is empty"},
        413: {"model": ErrorResponse, "description": "File too large"},
    },
)
def create_file(
    file: UploadFile,
    feature: CurrentFeatureDep,
    user: CurrentUserDep,
    manager: FeatureFileManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> ItemResponse[FeatureFileItem]:
    feature_file = manager.create(feature, user, file)
    return ItemResponse(item=_file_item(feature_file, download_url=manager.download_url_for(feature_file)))


@router.get(
    "/{feature_file_id}",
    operation_id="api_features_files_get",
    summary="Get a feature file",
    description=(
        "Return a single file of the feature, including a time-limited `downloadUrl`. "
        "Any member may read."
    ),
    response_model=ItemResponse[FeatureFileItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_file(
    _: CurrentAccountUserDep,
    feature_file: CurrentFeatureFileDep,
    manager: FeatureFileManagerDep,
) -> ItemResponse[FeatureFileItem]:
    return ItemResponse(item=_file_item(feature_file, download_url=manager.download_url_for(feature_file)))


@router.patch(
    "/{feature_file_id}",
    operation_id="api_features_files_update",
    summary="Update a feature file",
    description=(
        "Partially update a file's metadata (type, name, description). "
        "Every contributing role may edit files."
    ),
    response_model=ItemResponse[FeatureFileItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_file(
    form: FeatureFilePatchForm,
    feature_file: CurrentFeatureFileDep,
    manager: FeatureFileManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> ItemResponse[FeatureFileItem]:
    updated = manager.apply_update(feature_file, form.model_dump(exclude_unset=True))
    return ItemResponse(item=_file_item(updated, download_url=manager.download_url_for(updated)))


@router.post(
    "/{feature_file_id}/activate",
    operation_id="api_features_files_activate",
    summary="Restore a feature file",
    description="Restore an archived file to the uploaded state. Every contributing role may do this.",
    response_model=ItemResponse[FeatureFileItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def activate_file(
    feature_file: CurrentFeatureFileDep,
    manager: FeatureFileManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> ItemResponse[FeatureFileItem]:
    updated = manager.set_status(feature_file, FeatureFileStatus.UPLOADED)
    return ItemResponse(item=_file_item(updated, download_url=manager.download_url_for(updated)))


@router.post(
    "/{feature_file_id}/archive",
    operation_id="api_features_files_archive",
    summary="Archive a feature file",
    description="Set the file status to archived. Every contributing role may do this.",
    response_model=ItemResponse[FeatureFileItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def archive_file(
    feature_file: CurrentFeatureFileDep,
    manager: FeatureFileManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> ItemResponse[FeatureFileItem]:
    updated = manager.set_status(feature_file, FeatureFileStatus.ARCHIVED)
    return ItemResponse(item=_file_item(updated, download_url=manager.download_url_for(updated)))


@router.delete(
    "/{feature_file_id}",
    operation_id="api_features_files_delete",
    summary="Delete a feature file",
    description="Soft-delete a file. Every contributing role may delete files.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_file(
    feature_file: CurrentFeatureFileDep,
    manager: FeatureFileManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> None:
    manager.soft_delete(feature_file)
