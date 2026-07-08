"""Current-user security: password, TOTP, recovery codes, security keys, logs.

Owns the authenticated user's own credential + second-factor lifecycle (as
opposed to `AuthManager`, which handles the login-time checks).
"""

import json
import secrets
import uuid
from datetime import UTC, datetime

import pyotp
from fastapi import HTTPException, status
from sqlmodel import Session, select
from webauthn import (
    generate_registration_options,
    options_to_json,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url
from webauthn.helpers.exceptions import InvalidRegistrationResponse
from webauthn.helpers.structs import PublicKeyCredentialDescriptor

from src.managers.token import U2FRegistrationTokenManager
from src.models.enum import (
    UserAuthenticationStatus,
    UserAuthenticationTwoFactorStatus,
    UserAuthenticationTwoFactorType,
    UserAuthenticationType,
)
from src.models.user import User
from src.models.user_authentication import UserAuthentication
from src.models.user_authentication_log import UserAuthenticationLog
from src.models.user_authentication_two_factor import UserAuthenticationTwoFactor
from src.serializes.me_security import (
    OtpProvisioningItem,
    RecoveryCodesItem,
    SecurityKeyItem,
    SecurityLogItem,
    SecurityOverviewItem,
    U2FRegistrationOptionsItem,
)
from src.settings import get_settings
from src.utils.passwords import hash_password, verify_password

_RECOVERY_CODE_COUNT = 10


def _now() -> datetime:
    return datetime.now(tz=UTC)


def _generate_recovery_code() -> str:
    return "-".join(secrets.token_hex(2) for _ in range(3))


class MeSecurityManager:
    def __init__(self, session: Session):
        self.session = session

    # ----------------------------------------------------------- credentials

    def _password_authentication(self, user: User) -> UserAuthentication | None:
        return self.session.exec(
            select(UserAuthentication).where(
                UserAuthentication.user_id == user.id,
                UserAuthentication.type == UserAuthenticationType.EMAIL_PASSWORD,
                UserAuthentication.enabled.is_(True),
            )
        ).first()

    def _google_authentication(self, user: User) -> UserAuthentication | None:
        return self.session.exec(
            select(UserAuthentication).where(
                UserAuthentication.user_id == user.id,
                UserAuthentication.type == UserAuthenticationType.GOOGLE_OAUTH,
                UserAuthentication.enabled.is_(True),
            )
        ).first()

    def _factors(self, user: User, factor_type: UserAuthenticationTwoFactorType, *, active_only: bool = True):
        query = select(UserAuthenticationTwoFactor).where(
            UserAuthenticationTwoFactor.user_id == user.id,
            UserAuthenticationTwoFactor.type == factor_type,
            UserAuthenticationTwoFactor.enabled.is_(True),
        )
        if active_only:
            query = query.where(UserAuthenticationTwoFactor.status == UserAuthenticationTwoFactorStatus.ACTIVE)
        return list(self.session.exec(query).all())

    def _owned_factor(self, user: User, factor_id: uuid.UUID) -> UserAuthenticationTwoFactor:
        factor = self.session.get(UserAuthenticationTwoFactor, factor_id)
        if factor is None or factor.user_id != user.id or not factor.enabled:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
        return factor

    # -------------------------------------------------------------- overview

    def overview(self, user: User) -> SecurityOverviewItem:
        otp = self._factors(user, UserAuthenticationTwoFactorType.OTP)
        keys = self._factors(user, UserAuthenticationTwoFactorType.U2F)
        recovery = self._factors(user, UserAuthenticationTwoFactorType.RECOVERY_CODE)
        return SecurityOverviewItem(
            has_password=self._password_authentication(user) is not None,
            google_linked=self._google_authentication(user) is not None,
            otp_enabled=len(otp) > 0,
            security_keys_count=len(keys),
            recovery_codes_remaining=len(recovery),
            two_factor_enabled=len(otp) > 0 or len(keys) > 0,
        )

    # -------------------------------------------------------------- password

    def create_password(self, user: User, password: str) -> None:
        existing = self._password_authentication(user)
        if existing is not None and existing.value:
            raise HTTPException(status.HTTP_409_CONFLICT, "A password is already set. Use the change-password endpoint.")
        now = _now()
        if existing is None:
            existing = UserAuthentication(
                type=UserAuthenticationType.EMAIL_PASSWORD,
                status=UserAuthenticationStatus.ACTIVE,
                email=user.email,
                user_id=user.id,
                created_date=now,
                activation_date=now,
            )
        existing.value = hash_password(password)
        existing.status = UserAuthenticationStatus.ACTIVE
        self.session.add(existing)

    def update_password(self, user: User, *, old_password: str, new_password: str) -> None:
        authentication = self._password_authentication(user)
        if authentication is None or not verify_password(authentication.value, old_password):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "The current password is incorrect.")
        authentication.value = hash_password(new_password)
        self.session.add(authentication)
        user.token_control = secrets.token_hex(16)  # sign out other sessions
        self.session.add(user)

    # ------------------------------------------------------------------- otp

    def generate_otp(self, user: User) -> OtpProvisioningItem:
        # Replace any half-finished secret so only one pending OTP exists.
        for pending in self._factors(user, UserAuthenticationTwoFactorType.OTP, active_only=False):
            if pending.status == UserAuthenticationTwoFactorStatus.NOT_VERIFIED:
                pending.enabled = False
                self.session.add(pending)

        secret = pyotp.random_base32()
        factor = UserAuthenticationTwoFactor(
            type=UserAuthenticationTwoFactorType.OTP,
            status=UserAuthenticationTwoFactorStatus.NOT_VERIFIED,
            value=secret,
            user_id=user.id,
            date=_now(),
        )
        self.session.add(factor)
        self.session.flush()
        uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name=get_settings().otp_issuer)
        return OtpProvisioningItem(id=factor.id, secret=secret, provisioning_uri=uri)

    def activate_otp(self, user: User, otp_id: uuid.UUID, code: str) -> RecoveryCodesItem:
        factor = self._owned_factor(user, otp_id)
        if factor.type != UserAuthenticationTwoFactorType.OTP or factor.status != UserAuthenticationTwoFactorStatus.NOT_VERIFIED:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This authenticator is not awaiting confirmation.")
        if not pyotp.TOTP(factor.value).verify(code, valid_window=1):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid code.")
        now = _now()
        factor.status = UserAuthenticationTwoFactorStatus.ACTIVE
        factor.activation_date = now
        self.session.add(factor)
        # First active factor → hand out a fresh set of recovery codes.
        return self._reset_recovery_codes(user)

    def disable_otp(self, user: User, otp_id: uuid.UUID) -> None:
        factor = self._owned_factor(user, otp_id)
        if factor.type != UserAuthenticationTwoFactorType.OTP:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
        factor.status = UserAuthenticationTwoFactorStatus.DISABLED
        factor.enabled = False
        self.session.add(factor)

    # ------------------------------------------------------------- recovery

    def _reset_recovery_codes(self, user: User) -> RecoveryCodesItem:
        for existing in self._factors(user, UserAuthenticationTwoFactorType.RECOVERY_CODE, active_only=False):
            existing.enabled = False
            existing.status = UserAuthenticationTwoFactorStatus.DISABLED
            self.session.add(existing)
        codes = [_generate_recovery_code() for _ in range(_RECOVERY_CODE_COUNT)]
        now = _now()
        for code in codes:
            self.session.add(
                UserAuthenticationTwoFactor(
                    type=UserAuthenticationTwoFactorType.RECOVERY_CODE,
                    status=UserAuthenticationTwoFactorStatus.ACTIVE,
                    value=code,
                    user_id=user.id,
                    date=now,
                    activation_date=now,
                )
            )
        return RecoveryCodesItem(codes=codes)

    def regenerate_recovery_codes(self, user: User) -> RecoveryCodesItem:
        return self._reset_recovery_codes(user)

    # ------------------------------------------------------------------- u2f

    def _to_key_item(self, factor: UserAuthenticationTwoFactor) -> SecurityKeyItem:
        return SecurityKeyItem(
            id=factor.id,
            nickname=(factor.data or {}).get("nickname"),
            registered_at=factor.activation_date or factor.date,
            last_used_at=factor.last_authentication_date,
        )

    def list_security_keys(self, user: User) -> list[SecurityKeyItem]:
        return [self._to_key_item(f) for f in self._factors(user, UserAuthenticationTwoFactorType.U2F)]

    def start_u2f_registration(self, user: User) -> U2FRegistrationOptionsItem:
        settings = get_settings()
        exclude = [
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(f.value))
            for f in self._factors(user, UserAuthenticationTwoFactorType.U2F)
        ]
        options = generate_registration_options(
            rp_id=settings.webauthn_rp_id,
            rp_name=settings.webauthn_rp_name,
            user_id=str(user.id).encode(),
            user_name=user.email,
            user_display_name=" ".join(filter(None, [user.first_name, user.last_name])) or user.email,
            exclude_credentials=exclude,
        )
        challenge = bytes_to_base64url(options.challenge)
        token = U2FRegistrationTokenManager(user, challenge=challenge).generate()
        return U2FRegistrationOptionsItem(options=json.loads(options_to_json(options)), registration_token=token)

    def verify_u2f_registration(self, user: User, *, registration_token: str, credential: dict, nickname: str | None) -> SecurityKeyItem:
        payload, _ = U2FRegistrationTokenManager.decode(registration_token)
        raw_id = (payload or {}).get("user", {}).get("id")
        challenge = (payload or {}).get("u2f", {}).get("challenge")
        if not raw_id or raw_id != str(user.id) or not challenge:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This registration session has expired. Please try again.")

        settings = get_settings()
        try:
            verification = verify_registration_response(
                credential=credential,
                expected_challenge=base64url_to_bytes(challenge),
                expected_rp_id=settings.webauthn_rp_id,
                expected_origin=settings.webauthn_origins,
                require_user_verification=False,
            )
        except InvalidRegistrationResponse:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Security key registration failed.")

        credential_id = bytes_to_base64url(verification.credential_id)
        now = _now()
        factor = UserAuthenticationTwoFactor(
            type=UserAuthenticationTwoFactorType.U2F,
            status=UserAuthenticationTwoFactorStatus.ACTIVE,
            value=credential_id,
            data={
                "public_key": bytes_to_base64url(verification.credential_public_key),
                "sign_count": verification.sign_count,
                "nickname": nickname,
            },
            user_id=user.id,
            date=now,
            activation_date=now,
        )
        self.session.add(factor)
        self.session.flush()
        return self._to_key_item(factor)

    def rename_security_key(self, user: User, u2f_id: uuid.UUID, nickname: str) -> SecurityKeyItem:
        factor = self._owned_factor(user, u2f_id)
        if factor.type != UserAuthenticationTwoFactorType.U2F:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
        factor.data = {**(factor.data or {}), "nickname": nickname}
        self.session.add(factor)
        return self._to_key_item(factor)

    def disable_security_key(self, user: User, u2f_id: uuid.UUID) -> None:
        factor = self._owned_factor(user, u2f_id)
        if factor.type != UserAuthenticationTwoFactorType.U2F:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")
        factor.status = UserAuthenticationTwoFactorStatus.DISABLED
        factor.enabled = False
        self.session.add(factor)

    # ------------------------------------------------------------------ logs

    def list_logs(self, user: User, *, limit: int = 50) -> list[SecurityLogItem]:
        rows = self.session.exec(
            select(UserAuthenticationLog)
            .where(UserAuthenticationLog.user_id == user.id)
            .order_by(UserAuthenticationLog.date.desc())
            .limit(limit)
        ).all()
        return [
            SecurityLogItem(id=row.id, type=row.type, status=row.status, date=row.date, ip=row.authentication_ip)
            for row in rows
        ]
