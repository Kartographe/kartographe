# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

from fastapi import APIRouter, status

from src.forms.auth import GoogleSsoForm
from src.serializes.auth import AuthResponse
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import AuthManagerDep

router = APIRouter(prefix="/sso")


@router.post(
    "/google",
    operation_id="api.auth.sso.google",
    summary="Sign in with Google",
    description=(
        "Authenticate with a Google ID token obtained in the browser. Creates "
        "the account on first sign-in. Returns the same shape as email login "
        "(may require a second factor)."
    ),
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Google sign-in failed"},
        404: {"model": ErrorResponse, "description": "Google sign-in is not configured"},
    },
)
def google_sso(form: GoogleSsoForm, manager: AuthManagerDep) -> AuthResponse:
    return manager.google_login(form.google_token)
