from fastapi import APIRouter, status

from src.forms.auth import ActivationForm, ResendActivationForm
from src.serializes._base import SuccessResponse
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import AuthManagerDep

router = APIRouter()


@router.post(
    "/activate",
    operation_id="api.auth.activate",
    summary="Confirm an account from its activation link",
    description="Activate a newly registered account using the token from the activation email.",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    responses={400: {"model": ErrorResponse, "description": "Invalid or expired activation link"}},
)
def activate(form: ActivationForm, manager: AuthManagerDep) -> SuccessResponse:
    manager.activate(form.token)
    return SuccessResponse()


@router.post(
    "/resendActivation",
    operation_id="api.auth.resendActivation",
    summary="Re-send the activation email",
    description="Ask for a fresh activation email. Always succeeds, whether or not the email has a pending account.",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
)
def resend_activation(form: ResendActivationForm, manager: AuthManagerDep) -> SuccessResponse:
    manager.resend_activation(form.email)
    return SuccessResponse()
