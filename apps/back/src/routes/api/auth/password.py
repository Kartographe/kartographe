# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

from fastapi import APIRouter, status

from src.forms.auth import ForgotPasswordForm, ResetPasswordForm
from src.serializes._base import SuccessResponse
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import AuthManagerDep

router = APIRouter(prefix="/password")


@router.post(
    "/forgot",
    operation_id="api_auth_password_forgot",
    summary="Request a password-reset email",
    description="Send a password-reset link to the given email. Always succeeds so registered emails aren't revealed.",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
)
def forgot_password(form: ForgotPasswordForm, manager: AuthManagerDep) -> SuccessResponse:
    manager.forgot_password(form.email)
    return SuccessResponse()


@router.post(
    "/reset",
    operation_id="api_auth_password_reset",
    summary="Set a new password from a reset link",
    description="Set a new password using the token from the reset email. Invalidates all existing sessions.",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    responses={400: {"model": ErrorResponse, "description": "Invalid or expired reset link"}},
)
def reset_password(form: ResetPasswordForm, manager: AuthManagerDep) -> SuccessResponse:
    manager.reset_password(token=form.token, password=form.password)
    return SuccessResponse()
