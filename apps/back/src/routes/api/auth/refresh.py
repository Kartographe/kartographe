from fastapi import APIRouter, status

from src.forms.auth import RefreshTokenForm
from src.serializes.auth import TokenResponse
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import AuthManagerDep

router = APIRouter()


@router.post(
    "/refresh",
    operation_id="api.auth.refresh",
    summary="Exchange a refresh token for a new token pair",
    description="Trade a valid refresh token for a fresh access + refresh pair. Call it when the access token has expired.",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    responses={401: {"model": ErrorResponse, "description": "Invalid or expired refresh token"}},
)
def refresh(form: RefreshTokenForm, manager: AuthManagerDep) -> TokenResponse:
    return manager.refresh(form.refresh_token)
