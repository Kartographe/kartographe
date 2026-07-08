"""`.../scenarios/{scenario_id}/steps/{step_id}/files` — step attachments.

Reads are open to any account member; writes are open to the editing roles. The
single-file read includes a time-limited `downloadUrl`; the listing omits it.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile, status

from src.forms.journeys import JourneyScenarioStepFilePatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, JourneyScenarioStepFileStatus
from src.models.journey_scenario_step_file import JourneyScenarioStepFile
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.journeys import JourneyScenarioStepFileItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountUserDep,
    CurrentJourneyScenarioStepDep,
    CurrentJourneyScenarioStepFileDep,
    CurrentUserDep,
    JourneyScenarioStepFileManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(
    prefix="/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/files",
    tags=["api.journeys.scenarios.steps.files"],
)

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Step or file not found"}}

_EDITOR = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.PRODUCT_OWNER,
    AccountUserRole.QA_MANAGER,
    AccountUserRole.DEVELOPER,
)


def _file_item(
    step_file: JourneyScenarioStepFile, *, download_url: str | None = None
) -> JourneyScenarioStepFileItem:
    item = JourneyScenarioStepFileItem.model_validate(step_file)
    item.download_url = download_url
    return item


@router.get(
    "",
    operation_id="api.journeys.scenarios.steps.files.list",
    summary="List step files",
    description="List the files attached to a step, most recent first. Any member may read.",
    response_model=ListingResponse[JourneyScenarioStepFileItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_files(
    _: CurrentAccountUserDep,
    step: CurrentJourneyScenarioStepDep,
    manager: JourneyScenarioStepFileManagerDep,
) -> ListingResponse[JourneyScenarioStepFileItem]:
    items = [JourneyScenarioStepFileItem.model_validate(row) for row in manager.list_for_step(step)]
    return ListingResponse.single_page(items)


@router.post(
    "",
    operation_id="api.journeys.scenarios.steps.files.create",
    summary="Upload a step file",
    description=(
        "Upload a file (multipart, field `file`) and attach it to the step. Editing roles only."
    ),
    response_model=ItemResponse[JourneyScenarioStepFileItem],
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
    step: CurrentJourneyScenarioStepDep,
    user: CurrentUserDep,
    manager: JourneyScenarioStepFileManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyScenarioStepFileItem]:
    step_file = manager.create(step, user, file)
    return ItemResponse(item=_file_item(step_file, download_url=manager.download_url_for(step_file)))


@router.get(
    "/{step_file_id}",
    operation_id="api.journeys.scenarios.steps.files.get",
    summary="Get a step file",
    description=(
        "Return a single file of the step, including a time-limited `downloadUrl`. "
        "Any member may read."
    ),
    response_model=ItemResponse[JourneyScenarioStepFileItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_file(
    _: CurrentAccountUserDep,
    step_file: CurrentJourneyScenarioStepFileDep,
    manager: JourneyScenarioStepFileManagerDep,
) -> ItemResponse[JourneyScenarioStepFileItem]:
    return ItemResponse(item=_file_item(step_file, download_url=manager.download_url_for(step_file)))


@router.patch(
    "/{step_file_id}",
    operation_id="api.journeys.scenarios.steps.files.update",
    summary="Update a step file",
    description="Partially update a file's metadata (type, name, description). Editing roles only.",
    response_model=ItemResponse[JourneyScenarioStepFileItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_file(
    form: JourneyScenarioStepFilePatchForm,
    step_file: CurrentJourneyScenarioStepFileDep,
    manager: JourneyScenarioStepFileManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyScenarioStepFileItem]:
    updated = manager.apply_update(step_file, form.model_dump(exclude_unset=True))
    return ItemResponse(item=_file_item(updated, download_url=manager.download_url_for(updated)))


@router.post(
    "/{step_file_id}/activate",
    operation_id="api.journeys.scenarios.steps.files.activate",
    summary="Restore a step file",
    description="Restore an archived file to the uploaded state. Editing roles only.",
    response_model=ItemResponse[JourneyScenarioStepFileItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def activate_file(
    step_file: CurrentJourneyScenarioStepFileDep,
    manager: JourneyScenarioStepFileManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyScenarioStepFileItem]:
    updated = manager.set_status(step_file, JourneyScenarioStepFileStatus.UPLOADED)
    return ItemResponse(item=_file_item(updated, download_url=manager.download_url_for(updated)))


@router.post(
    "/{step_file_id}/archive",
    operation_id="api.journeys.scenarios.steps.files.archive",
    summary="Archive a step file",
    description="Set the file status to archived. Editing roles only.",
    response_model=ItemResponse[JourneyScenarioStepFileItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def archive_file(
    step_file: CurrentJourneyScenarioStepFileDep,
    manager: JourneyScenarioStepFileManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> ItemResponse[JourneyScenarioStepFileItem]:
    updated = manager.set_status(step_file, JourneyScenarioStepFileStatus.ARCHIVED)
    return ItemResponse(item=_file_item(updated, download_url=manager.download_url_for(updated)))


@router.delete(
    "/{step_file_id}",
    operation_id="api.journeys.scenarios.steps.files.delete",
    summary="Delete a step file",
    description="Soft-delete a file. Editing roles only.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_file(
    step_file: CurrentJourneyScenarioStepFileDep,
    manager: JourneyScenarioStepFileManagerDep,
    _: Annotated[AccountUser, Depends(_EDITOR)],
) -> None:
    manager.soft_delete(step_file)
