# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

from fastapi import APIRouter, status

from src.forms.auth import RegisterForm
from src.serializes._base import SuccessResponse
from src.utils.dependencies import AuthManagerDep

router = APIRouter()


@router.post(
    "/register",
    operation_id="api_auth_register",
    summary="Create a new account",
    description=(
        "Register a new email/password account. Always succeeds (a taken email "
        "is not revealed) and sends an activation email the user must confirm "
        "before signing in."
    ),
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
)
def register(form: RegisterForm, manager: AuthManagerDep) -> SuccessResponse:
    manager.register(
        email=form.email,
        password=form.password,
        first_name=form.first_name,
        last_name=form.last_name,
        gender=form.gender,
        language=form.language,
    )
    return SuccessResponse()
