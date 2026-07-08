from fastapi import APIRouter, status

from src.forms.me import MePatchForm
from src.serializes._base import ItemResponse
from src.serializes.errors import ErrorResponse
from src.serializes.me import MeItem
from src.utils.dependencies import CurrentUserDep, MeManagerDep

router = APIRouter(prefix="/me", tags=["api.me"])

_UNAUTHORIZED = {401: {"model": ErrorResponse, "description": "Authentication required"}}


@router.get(
    "",
    operation_id="api.me.get",
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
    operation_id="api.me.update",
    summary="Update the signed-in user's profile",
    description="Partially update the current user's profile — only the fields sent are changed.",
    response_model=ItemResponse[MeItem],
    status_code=status.HTTP_200_OK,
    responses=_UNAUTHORIZED,
)
def update_me(form: MePatchForm, user: CurrentUserDep, manager: MeManagerDep) -> ItemResponse[MeItem]:
    updated = manager.update(user, form.model_dump(exclude_unset=True))
    return ItemResponse(item=manager.to_item(updated))
