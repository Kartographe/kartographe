# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

import uuid

from fastapi import APIRouter, status

from src.forms.me_security import (
    ActivateOtpForm,
    CreatePasswordForm,
    RenameSecurityKeyForm,
    U2FRegistrationVerifyForm,
    UpdatePasswordForm,
)
from src.serializes._base import ItemResponse, ListingResponse, SuccessResponse
from src.serializes.errors import ErrorResponse
from src.serializes.me_security import (
    OtpMethodItem,
    OtpProvisioningItem,
    RecoveryCodesItem,
    SecurityKeyItem,
    SecurityLogItem,
    SecurityOverviewItem,
    U2FRegistrationOptionsItem,
)
from src.utils.dependencies import CurrentUserDep, MeSecurityManagerDep

router = APIRouter(prefix="/me/security", tags=["api.me.security"])

_UNAUTHORIZED = {401: {"model": ErrorResponse, "description": "Authentication required"}}
_BAD_REQUEST = {400: {"model": ErrorResponse, "description": "Invalid input"}}


@router.get(
    "",
    operation_id="api_me_security_overview",
    summary="Get the account's security overview",
    description="Return whether a password, Google link, authenticator, recovery codes and security keys are set.",
    response_model=ItemResponse[SecurityOverviewItem],
    responses=_UNAUTHORIZED,
)
def overview(user: CurrentUserDep, manager: MeSecurityManagerDep) -> ItemResponse[SecurityOverviewItem]:
    return ItemResponse(item=manager.overview(user))


@router.post(
    "/password",
    operation_id="api_me_security_password_create",
    summary="Set a password on the account",
    description="Set a password on an account that doesn't have one yet (e.g. created via Google).",
    response_model=SuccessResponse,
    responses={**_UNAUTHORIZED, 409: {"model": ErrorResponse, "description": "A password is already set"}},
)
def create_password(form: CreatePasswordForm, user: CurrentUserDep, manager: MeSecurityManagerDep) -> SuccessResponse:
    manager.create_password(user, form.password)
    return SuccessResponse()


@router.patch(
    "/password",
    operation_id="api_me_security_password_update",
    summary="Change the account password",
    description="Change the password. Requires the current password and signs out other sessions.",
    response_model=SuccessResponse,
    responses={**_UNAUTHORIZED, **_BAD_REQUEST},
)
def update_password(form: UpdatePasswordForm, user: CurrentUserDep, manager: MeSecurityManagerDep) -> SuccessResponse:
    manager.update_password(user, old_password=form.old_password, new_password=form.new_password)
    return SuccessResponse()


@router.get(
    "/otp",
    operation_id="api_me_security_otp_list",
    summary="List active authenticators",
    description="List the authenticators (TOTP) currently active on the account.",
    response_model=ListingResponse[OtpMethodItem],
    responses=_UNAUTHORIZED,
)
def list_otp(user: CurrentUserDep, manager: MeSecurityManagerDep) -> ListingResponse[OtpMethodItem]:
    return ListingResponse.single_page(manager.list_otp(user))


@router.post(
    "/otp",
    operation_id="api_me_security_otp_generate",
    summary="Start authenticator (TOTP) setup",
    description="Generate a new authenticator secret and its provisioning URI (render as a QR code). Confirm it with a code to activate.",
    response_model=ItemResponse[OtpProvisioningItem],
    responses=_UNAUTHORIZED,
)
def generate_otp(user: CurrentUserDep, manager: MeSecurityManagerDep) -> ItemResponse[OtpProvisioningItem]:
    return ItemResponse(item=manager.generate_otp(user))


@router.post(
    "/otp/{otp_id}/activate",
    operation_id="api_me_security_otp_activate",
    summary="Confirm and activate an authenticator",
    description="Confirm the pending authenticator with a live 6-digit code. Returns a fresh set of one-time recovery codes.",
    response_model=ItemResponse[RecoveryCodesItem],
    responses={**_UNAUTHORIZED, **_BAD_REQUEST},
)
def activate_otp(
    otp_id: uuid.UUID, form: ActivateOtpForm, user: CurrentUserDep, manager: MeSecurityManagerDep
) -> ItemResponse[RecoveryCodesItem]:
    return ItemResponse(item=manager.activate_otp(user, otp_id, form.code))


@router.delete(
    "/otp/{otp_id}",
    operation_id="api_me_security_otp_disable",
    summary="Remove an authenticator",
    description="Disable a registered authenticator.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_UNAUTHORIZED, 404: {"model": ErrorResponse, "description": "Not found"}},
)
def disable_otp(otp_id: uuid.UUID, user: CurrentUserDep, manager: MeSecurityManagerDep) -> None:
    manager.disable_otp(user, otp_id)


@router.post(
    "/recovery-codes",
    operation_id="api_me_security_recoveryCodes_regenerate",
    summary="Regenerate recovery codes",
    description="Replace all recovery codes with a fresh set. The old codes stop working immediately.",
    response_model=ItemResponse[RecoveryCodesItem],
    responses=_UNAUTHORIZED,
)
def regenerate_recovery_codes(user: CurrentUserDep, manager: MeSecurityManagerDep) -> ItemResponse[RecoveryCodesItem]:
    return ItemResponse(item=manager.regenerate_recovery_codes(user))


@router.get(
    "/u2f",
    operation_id="api_me_security_u2f_list",
    summary="List registered security keys",
    description="List the WebAuthn security keys registered on the account.",
    response_model=ListingResponse[SecurityKeyItem],
    responses=_UNAUTHORIZED,
)
def list_security_keys(user: CurrentUserDep, manager: MeSecurityManagerDep) -> ListingResponse[SecurityKeyItem]:
    return ListingResponse.single_page(manager.list_security_keys(user))


@router.post(
    "/u2f/options",
    operation_id="api_me_security_u2f_options",
    summary="Get security-key registration options",
    description="Start registering a security key: returns WebAuthn options for `navigator.credentials.create` plus a binding token.",
    response_model=ItemResponse[U2FRegistrationOptionsItem],
    responses=_UNAUTHORIZED,
)
def u2f_registration_options(user: CurrentUserDep, manager: MeSecurityManagerDep) -> ItemResponse[U2FRegistrationOptionsItem]:
    return ItemResponse(item=manager.start_u2f_registration(user))


@router.post(
    "/u2f",
    operation_id="api_me_security_u2f_register",
    summary="Register a security key",
    description="Finish registering a security key with the browser's attestation and an optional label.",
    response_model=ItemResponse[SecurityKeyItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_UNAUTHORIZED, **_BAD_REQUEST},
)
def register_security_key(
    form: U2FRegistrationVerifyForm, user: CurrentUserDep, manager: MeSecurityManagerDep
) -> ItemResponse[SecurityKeyItem]:
    item = manager.verify_u2f_registration(
        user, registration_token=form.registration_token, credential=form.credential, nickname=form.nickname
    )
    return ItemResponse(item=item)


@router.patch(
    "/u2f/{u2f_id}",
    operation_id="api_me_security_u2f_rename",
    summary="Rename a security key",
    description="Change the label of a registered security key.",
    response_model=ItemResponse[SecurityKeyItem],
    responses={**_UNAUTHORIZED, 404: {"model": ErrorResponse, "description": "Not found"}},
)
def rename_security_key(
    u2f_id: uuid.UUID, form: RenameSecurityKeyForm, user: CurrentUserDep, manager: MeSecurityManagerDep
) -> ItemResponse[SecurityKeyItem]:
    return ItemResponse(item=manager.rename_security_key(user, u2f_id, form.nickname))


@router.delete(
    "/u2f/{u2f_id}",
    operation_id="api_me_security_u2f_disable",
    summary="Remove a security key",
    description="Unregister a security key.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_UNAUTHORIZED, 404: {"model": ErrorResponse, "description": "Not found"}},
)
def disable_security_key(u2f_id: uuid.UUID, user: CurrentUserDep, manager: MeSecurityManagerDep) -> None:
    manager.disable_security_key(user, u2f_id)


@router.get(
    "/logs",
    operation_id="api_me_security_logs_list",
    summary="List recent authentication activity",
    description="Return the most recent authentication-log entries for the account (newest first).",
    response_model=ListingResponse[SecurityLogItem],
    responses=_UNAUTHORIZED,
)
def list_logs(user: CurrentUserDep, manager: MeSecurityManagerDep) -> ListingResponse[SecurityLogItem]:
    return ListingResponse.single_page(manager.list_logs(user))
