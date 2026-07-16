# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

from fastapi import APIRouter, status

from src.forms.auth import TwoFactorForm, U2FAssertionOptionsForm, U2FAssertionVerifyForm
from src.models.enum import UserAuthenticationLogType, UserAuthenticationTwoFactorType
from src.serializes._base import ItemResponse
from src.serializes.auth import TokenResponse, U2FAssertionOptionsItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import AuthManagerDep

router = APIRouter(prefix="/twoFactor")

_INVALID = {400: {"model": ErrorResponse, "description": "Invalid code"}}
_EXPIRED = {401: {"model": ErrorResponse, "description": "Verification session expired"}}


@router.post(
    "/otp",
    operation_id="api.auth.twoFactor.otp",
    summary="Complete login with an authenticator code",
    description="Second-factor step: exchange the intermediate token and a 6-digit authenticator code for a full session.",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    responses={**_INVALID, **_EXPIRED},
)
def two_factor_otp(form: TwoFactorForm, manager: AuthManagerDep) -> TokenResponse:
    return manager.login_two_factor(
        token=form.token,
        value=form.value,
        two_factor_type=UserAuthenticationTwoFactorType.OTP,
        log_type=UserAuthenticationLogType.TWO_FACTOR_OTP,
    )


@router.post(
    "/recoveryCode",
    operation_id="api.auth.twoFactor.recoveryCode",
    summary="Complete login with a recovery code",
    description="Second-factor fallback: exchange the intermediate token and a one-time recovery code for a full session.",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    responses={**_INVALID, **_EXPIRED},
)
def two_factor_recovery_code(form: TwoFactorForm, manager: AuthManagerDep) -> TokenResponse:
    return manager.login_two_factor(
        token=form.token,
        value=form.value,
        two_factor_type=UserAuthenticationTwoFactorType.RECOVERY_CODE,
        log_type=UserAuthenticationLogType.TWO_FACTOR_RECOVERY_CODE,
    )


@router.post(
    "/u2f/options",
    operation_id="api.auth.twoFactor.u2f.options",
    summary="Get security-key assertion options",
    description="Start a security-key login: returns the WebAuthn options for `navigator.credentials.get` plus a token binding them to this login.",
    response_model=ItemResponse[U2FAssertionOptionsItem],
    status_code=status.HTTP_200_OK,
    responses=_EXPIRED,
)
def two_factor_u2f_options(form: U2FAssertionOptionsForm, manager: AuthManagerDep) -> ItemResponse[U2FAssertionOptionsItem]:
    return ItemResponse(item=manager.generate_u2f_assertion_options(form.token))


@router.post(
    "/u2f",
    operation_id="api.auth.twoFactor.u2f",
    summary="Complete login with a security key",
    description="Second-factor step: verify the browser's WebAuthn assertion and return a full session.",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    responses={**_INVALID, **_EXPIRED},
)
def two_factor_u2f(form: U2FAssertionVerifyForm, manager: AuthManagerDep) -> TokenResponse:
    return manager.login_two_factor_u2f(assertion_token=form.assertion_token, credential=form.credential)
