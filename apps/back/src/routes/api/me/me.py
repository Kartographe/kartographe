# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

from fastapi import APIRouter, UploadFile, status

from src.forms.me import MePatchForm
from src.serializes._base import ItemResponse
from src.serializes.errors import ErrorResponse
from src.serializes.me import MeItem
from src.utils.dependencies import CurrentUserDep, MeManagerDep

router = APIRouter(prefix="/me", tags=["api.me"])

_UNAUTHORIZED = {401: {"model": ErrorResponse, "description": "Authentication required"}}


@router.get(
    "",
    operation_id="api_me_get",
    summary="Get the signed-in user's profile",
    description="Return the profile of the currently authenticated user.",
    response_model=ItemResponse[MeItem],
    status_code=status.HTTP_200_OK,
    responses=_UNAUTHORIZED,
)
def get_me(user: CurrentUserDep, manager: MeManagerDep) -> ItemResponse[MeItem]:
    return ItemResponse(item=manager.to_item(user))


@router.patch(
    "",
    operation_id="api_me_update",
    summary="Update the signed-in user's profile",
    description="Partially update the current user's profile — only the fields sent are changed.",
    response_model=ItemResponse[MeItem],
    status_code=status.HTTP_200_OK,
    responses=_UNAUTHORIZED,
)
def update_me(form: MePatchForm, user: CurrentUserDep, manager: MeManagerDep) -> ItemResponse[MeItem]:
    updated = manager.update(user, form.model_dump(exclude_unset=True))
    return ItemResponse(item=manager.to_item(updated))


@router.post(
    "/picture",
    operation_id="api_me_setPicture",
    summary="Upload the signed-in user's profile picture",
    description=(
        "Upload a profile picture (multipart, field `file`). The image is "
        "center-cropped to a square and resized server-side; the previous "
        "picture is replaced."
    ),
    response_model=ItemResponse[MeItem],
    status_code=status.HTTP_200_OK,
    responses={
        **_UNAUTHORIZED,
        400: {"model": ErrorResponse, "description": "Unsupported image format"},
        413: {"model": ErrorResponse, "description": "Image too large"},
    },
)
def set_picture(file: UploadFile, user: CurrentUserDep, manager: MeManagerDep) -> ItemResponse[MeItem]:
    updated = manager.set_profile_picture(user, file)
    return ItemResponse(item=manager.to_item(updated))
