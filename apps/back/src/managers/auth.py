"""Authentication business logic.

Orchestrates users, credentials, second factors and the audit log. Routes stay
thin one-liners delegating here; this module never touches HTTP request/response
objects beyond raising `HTTPException` with a client-facing message.

Notes:
- Passwords are hashed with argon2id (`argon2-cffi`), which embeds a random
  salt in the hash string — no deterministic per-user salt.
- Any password reset rotates `User.token_control`, which is embedded in every
  issued access token, so all previously minted tokens stop validating at once.
- `resend_activation` and `forgot_password` are deliberately silent (always
  succeed) to avoid leaking which emails have an account.
"""

import json
import secrets
import uuid
from datetime import UTC, datetime

import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import Argon2Error, VerifyMismatchError
from fastapi import HTTPException, status
from sqlmodel import Session, select
from webauthn import generate_authentication_options, options_to_json, verify_authentication_response
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url
from webauthn.helpers.exceptions import InvalidAuthenticationResponse
from webauthn.helpers.structs import PublicKeyCredentialDescriptor, UserVerificationRequirement

from src.managers.auth_notification import AuthNotificationManager
from src.managers.token import (
    ActivationTokenManager,
    ResetTokenManager,
    TwoFactorTokenManager,
    U2FChallengeTokenManager,
    UserTokenManager,
)
from src.models.enum import (
    Language,
    UserAuthenticationLogStatus,
    UserAuthenticationLogType,
    UserAuthenticationStatus,
    UserAuthenticationTwoFactorStatus,
    UserAuthenticationTwoFactorType,
    UserAuthenticationType,
    UserGender,
    UserStatus,
)
from src.models.user import User
from src.models.user_authentication import UserAuthentication
from src.models.user_authentication_log import UserAuthenticationLog
from src.models.user_authentication_two_factor import UserAuthenticationTwoFactor
from src.services.google import GoogleService
from src.settings import get_settings

_hasher = PasswordHasher()


def _now() -> datetime:
    return datetime.now(tz=UTC)


class AuthManager:
    def __init__(self, session: Session, request_ip: str | None = None):
        self.session = session
        self.request_ip = request_ip
        self.notifications = AuthNotificationManager()

    # ------------------------------------------------------------------ utils

    @staticmethod
    def _hash_password(password: str) -> str:
        return _hasher.hash(password)

    @staticmethod
    def _verify_password(hashed: str | None, password: str) -> bool:
        if not hashed:
            return False
        try:
            return _hasher.verify(hashed, password)
        except (VerifyMismatchError, Argon2Error):
            return False

    def _log(
        self,
        log_type: UserAuthenticationLogType,
        log_status: UserAuthenticationLogStatus,
        *,
        user: User | None = None,
        authentication: UserAuthentication | None = None,
        two_factor: UserAuthenticationTwoFactor | None = None,
    ) -> None:
        self.session.add(
            UserAuthenticationLog(
                type=log_type,
                status=log_status,
                date=_now(),
                authentication_ip=self.request_ip,
                user_id=user.id if user else None,
                user_authentication_id=authentication.id if authentication else None,
                user_authentication_two_factor_id=two_factor.id if two_factor else None,
            )
        )

    def _find_authentication(
        self,
        email: str,
        auth_type: UserAuthenticationType,
    ) -> UserAuthentication | None:
        return self.session.exec(
            select(UserAuthentication).where(
                UserAuthentication.email == email,
                UserAuthentication.type == auth_type,
                UserAuthentication.enabled.is_(True),
            )
        ).first()

    def _active_two_factors(self, user: User) -> list[UserAuthenticationTwoFactor]:
        return list(
            self.session.exec(
                select(UserAuthenticationTwoFactor).where(
                    UserAuthenticationTwoFactor.user_id == user.id,
                    UserAuthenticationTwoFactor.status == UserAuthenticationTwoFactorStatus.ACTIVE,
                    UserAuthenticationTwoFactor.enabled.is_(True),
                )
            ).all()
        )

    @staticmethod
    def _available_two_factor_types(
        factors: list[UserAuthenticationTwoFactor],
    ) -> list[UserAuthenticationTwoFactorType]:
        # Recovery codes are always offered as a fallback when any factor exists.
        types = {f.type for f in factors}
        types.discard(UserAuthenticationTwoFactorType.RECOVERY_CODE)
        ordered = [t for t in (UserAuthenticationTwoFactorType.U2F, UserAuthenticationTwoFactorType.OTP) if t in types]
        if ordered:
            ordered.append(UserAuthenticationTwoFactorType.RECOVERY_CODE)
        return ordered

    def _authenticate(self, user: User, authentication: UserAuthentication, remember_me: bool) -> dict:
        now = _now()
        user.last_connected_date = now
        user.last_authentication_ip = self.request_ip
        authentication.last_authentication_date = now
        authentication.last_authentication_ip = self.request_ip
        self.session.add(user)
        self.session.add(authentication)
        return UserTokenManager(user, remember_me=remember_me).generate()

    def _load_user(self, user_id: uuid.UUID) -> User | None:
        return self.session.exec(
            select(User).where(User.id == user_id, User.enabled.is_(True))
        ).first()

    # --------------------------------------------------------------- register

    def register(
        self,
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        gender: UserGender,
        language: Language,
    ) -> None:
        existing = self._find_authentication(email, UserAuthenticationType.EMAIL_PASSWORD)
        if existing is not None:
            # Don't reveal whether the email is taken — mimic a fresh signup.
            self._log(UserAuthenticationLogType.REGISTER, UserAuthenticationLogStatus.ERROR, authentication=existing)
            return

        now = _now()
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            gender=gender,
            language=language,
            status=UserStatus.ACTIVE,
            created_date=now,
            created_ip=self.request_ip,
        )
        self.session.add(user)
        self.session.flush()

        authentication = UserAuthentication(
            type=UserAuthenticationType.EMAIL_PASSWORD,
            status=UserAuthenticationStatus.NOT_VERIFIED,
            email=email,
            value=self._hash_password(password),
            user_id=user.id,
            created_date=now,
            created_ip=self.request_ip,
        )
        self.session.add(authentication)
        self.session.flush()

        self._log(UserAuthenticationLogType.REGISTER, UserAuthenticationLogStatus.SUCCESS, user=user, authentication=authentication)
        token = ActivationTokenManager(authentication).generate()
        self.notifications.activation_link(email=authentication.email, first_name=user.first_name, token=token)

    def activate(self, token: str) -> None:
        payload, _ = ActivationTokenManager.decode(token)
        authentication_id = ActivationTokenManager.extract_authentication_id(payload) if payload else None
        authentication = None
        if authentication_id is not None:
            authentication = self.session.get(UserAuthentication, authentication_id)
        if authentication is None or not authentication.enabled:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This activation link is invalid or has expired.")
        if authentication.status == UserAuthenticationStatus.ACTIVE:
            return  # already activated — idempotent

        now = _now()
        authentication.status = UserAuthenticationStatus.ACTIVE
        authentication.activation_date = now
        authentication.activation_ip = self.request_ip
        self.session.add(authentication)

        user = self.session.get(User, authentication.user_id)
        if user is not None:
            user.activation_date = user.activation_date or now
            self.session.add(user)

        self._log(UserAuthenticationLogType.ACTIVATE, UserAuthenticationLogStatus.SUCCESS, user=user, authentication=authentication)
        self.notifications.welcome(email=authentication.email, first_name=user.first_name if user else None)

    def resend_activation(self, email: str) -> None:
        authentication = self._find_authentication(email, UserAuthenticationType.EMAIL_PASSWORD)
        if authentication is None or authentication.status != UserAuthenticationStatus.NOT_VERIFIED:
            return  # silent — no account enumeration
        user = self.session.get(User, authentication.user_id)
        token = ActivationTokenManager(authentication).generate()
        self.notifications.activation_link(
            email=authentication.email,
            first_name=user.first_name if user else None,
            token=token,
        )

    # ------------------------------------------------------------------ login

    def login(self, *, email: str, password: str, remember_me: bool) -> dict:
        authentication = self._find_authentication(email, UserAuthenticationType.EMAIL_PASSWORD)
        if authentication is None or not self._verify_password(authentication.value, password):
            self._log(UserAuthenticationLogType.EMAIL_PASSWORD, UserAuthenticationLogStatus.ERROR, authentication=authentication)
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid email or password.")
        if authentication.status == UserAuthenticationStatus.NOT_VERIFIED:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Please confirm your account from the email we sent you.")
        if authentication.status == UserAuthenticationStatus.BLOCKED:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is blocked.")

        user = self._load_user(authentication.user_id)
        if user is None or user.status != UserStatus.ACTIVE:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is not available.")

        return self._login_or_challenge(user, authentication, remember_me)

    def _login_or_challenge(self, user: User, authentication: UserAuthentication, remember_me: bool) -> dict:
        factors = self._active_two_factors(user)
        available = self._available_two_factor_types(factors)
        if available:
            token = TwoFactorTokenManager(user).generate()
            return {
                "item": {"access_token": token, "expires_in": TwoFactorTokenManager.TTL, "token_type": "Bearer"},
                "two_factor_available_types": available,
                "two_factor_enabled": True,
            }
        tokens = self._authenticate(user, authentication, remember_me)
        self._log(UserAuthenticationLogType.EMAIL_PASSWORD, UserAuthenticationLogStatus.SUCCESS, user=user, authentication=authentication)
        return {"item": tokens, "two_factor_available_types": [], "two_factor_enabled": False}

    def _resolve_intermediate_user(self, token: str) -> User:
        payload, _ = TwoFactorTokenManager.decode(token)
        raw_id = (payload or {}).get("user", {}).get("id")
        user = self._load_user(uuid.UUID(raw_id)) if raw_id else None
        if user is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "This verification session has expired. Please sign in again.")
        # token_control rotation invalidates a stale intermediate token too.
        if (payload or {}).get("user", {}).get("tokenControl") != user.token_control:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "This verification session has expired. Please sign in again.")
        return user

    def _finish_two_factor(self, user: User, log_type: UserAuthenticationLogType, two_factor: UserAuthenticationTwoFactor) -> dict:
        authentication = self._find_authentication(user.email, UserAuthenticationType.EMAIL_PASSWORD)
        tokens = self._authenticate(user, authentication, remember_me=False) if authentication else UserTokenManager(user).generate()
        two_factor.last_authentication_date = _now()
        two_factor.last_authentication_ip = self.request_ip
        self.session.add(two_factor)
        self._log(log_type, UserAuthenticationLogStatus.SUCCESS, user=user, authentication=authentication, two_factor=two_factor)
        return {"item": tokens}

    def login_two_factor(self, *, token: str, value: str, two_factor_type: UserAuthenticationTwoFactorType, log_type: UserAuthenticationLogType) -> dict:
        user = self._resolve_intermediate_user(token)
        if two_factor_type == UserAuthenticationTwoFactorType.RECOVERY_CODE:
            factor = self._consume_recovery_code(user, value)
        else:
            factor = self._verify_otp(user, value)
        if factor is None:
            self._log(log_type, UserAuthenticationLogStatus.ERROR, user=user)
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid code.")
        return self._finish_two_factor(user, log_type, factor)

    def _verify_otp(self, user: User, value: str) -> UserAuthenticationTwoFactor | None:
        for factor in self._active_two_factors(user):
            if factor.type != UserAuthenticationTwoFactorType.OTP:
                continue
            if pyotp.TOTP(factor.value).verify(value, valid_window=1):
                return factor
        return None

    def _consume_recovery_code(self, user: User, value: str) -> UserAuthenticationTwoFactor | None:
        normalized = value.strip().replace("-", "").upper()
        for factor in self._active_two_factors(user):
            if factor.type != UserAuthenticationTwoFactorType.RECOVERY_CODE:
                continue
            if secrets.compare_digest(factor.value.replace("-", "").upper(), normalized):
                factor.status = UserAuthenticationTwoFactorStatus.USED
                self.session.add(factor)
                return factor
        return None

    # -------------------------------------------------------------------- U2F

    def generate_u2f_assertion_options(self, token: str) -> dict:
        user = self._resolve_intermediate_user(token)
        settings = get_settings()
        credentials = [
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(f.value))
            for f in self._active_two_factors(user)
            if f.type == UserAuthenticationTwoFactorType.U2F
        ]
        if not credentials:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "No security key is registered on this account.")
        options = generate_authentication_options(
            rp_id=settings.webauthn_rp_id,
            allow_credentials=credentials,
            user_verification=UserVerificationRequirement.PREFERRED,
        )
        challenge = bytes_to_base64url(options.challenge)
        assertion_token = U2FChallengeTokenManager(user, challenge=challenge).generate()
        # `options_to_json` returns a JSON string; the serializer exposes a JSON
        # object, so parse it back for the front to feed `navigator.credentials`.
        return {"assertion_token": assertion_token, "options": json.loads(options_to_json(options))}

    def login_two_factor_u2f(self, *, assertion_token: str, credential: dict) -> dict:
        payload, _ = U2FChallengeTokenManager.decode(assertion_token)
        raw_id = (payload or {}).get("user", {}).get("id")
        challenge = (payload or {}).get("u2f", {}).get("challenge")
        user = self._load_user(uuid.UUID(raw_id)) if raw_id else None
        if user is None or not challenge:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "This verification session has expired. Please sign in again.")

        credential_id = credential.get("id") or credential.get("rawId")
        factor = None
        for candidate in self._active_two_factors(user):
            if candidate.type == UserAuthenticationTwoFactorType.U2F and candidate.value == credential_id:
                factor = candidate
                break
        if factor is None or not factor.data:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown security key.")

        settings = get_settings()
        try:
            verification = verify_authentication_response(
                credential=credential,
                expected_challenge=base64url_to_bytes(challenge),
                expected_rp_id=settings.webauthn_rp_id,
                expected_origin=settings.webauthn_origins,
                credential_public_key=base64url_to_bytes(factor.data["public_key"]),
                credential_current_sign_count=factor.data.get("sign_count", 0),
                require_user_verification=False,
            )
        except InvalidAuthenticationResponse:
            self._log(UserAuthenticationLogType.TWO_FACTOR_U2F, UserAuthenticationLogStatus.ERROR, user=user, two_factor=factor)
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Security key verification failed.")

        factor.data = {**factor.data, "sign_count": verification.new_sign_count}
        self.session.add(factor)
        return self._finish_two_factor(user, UserAuthenticationLogType.TWO_FACTOR_U2F, factor)

    # ---------------------------------------------------------------- refresh

    def refresh(self, refresh_token: str) -> dict:
        payload, expired = UserTokenManager.decode_refresh(refresh_token)
        if payload is None:
            detail = "Your session has expired. Please sign in again." if expired else "Invalid refresh token."
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail)
        raw_id = payload.get("user", {}).get("id")
        user = self._load_user(uuid.UUID(raw_id)) if raw_id else None
        if user is None or payload.get("user", {}).get("tokenControl") != user.token_control:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session has expired. Please sign in again.")
        remember_me = bool(payload.get("rememberMe", False))
        self._log(UserAuthenticationLogType.REFRESH_TOKEN, UserAuthenticationLogStatus.SUCCESS, user=user)
        return {"item": UserTokenManager(user, remember_me=remember_me).generate()}

    # -------------------------------------------------------------- passwords

    def forgot_password(self, email: str) -> None:
        authentication = self._find_authentication(email, UserAuthenticationType.EMAIL_PASSWORD)
        if authentication is None:
            return  # silent
        if authentication.status == UserAuthenticationStatus.BLOCKED:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This account is blocked.")
        user = self.session.get(User, authentication.user_id)
        token = ResetTokenManager(authentication).generate()
        self._log(UserAuthenticationLogType.FORGOT_PASSWORD, UserAuthenticationLogStatus.SUCCESS, authentication=authentication)
        self.notifications.password_reset_link(
            email=authentication.email,
            first_name=user.first_name if user else None,
            token=token,
        )

    def reset_password(self, *, token: str, password: str) -> None:
        payload, _ = ResetTokenManager.decode(token)
        authentication_id = ResetTokenManager.extract_authentication_id(payload) if payload else None
        authentication = self.session.get(UserAuthentication, authentication_id) if authentication_id else None
        if authentication is None or not authentication.enabled:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "This reset link is invalid or has expired.")

        authentication.value = self._hash_password(password)
        # An unverified account that proves email ownership via the reset link
        # is effectively activated.
        if authentication.status == UserAuthenticationStatus.NOT_VERIFIED:
            authentication.status = UserAuthenticationStatus.ACTIVE
            authentication.activation_date = _now()
        self.session.add(authentication)

        user = self.session.get(User, authentication.user_id)
        if user is not None:
            user.token_control = secrets.token_hex(16)  # revoke every issued token
            self.session.add(user)

        self._log(UserAuthenticationLogType.RESET_PASSWORD, UserAuthenticationLogStatus.SUCCESS, user=user, authentication=authentication)
        self.notifications.password_changed(email=authentication.email, first_name=user.first_name if user else None)

    # ----------------------------------------------------------------- google

    def google_login(self, google_token: str) -> dict:
        if not get_settings().google_enabled:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Google sign-in is not available.")
        info = GoogleService.get_information_from_token(google_token)
        if info is None or not info.get("email") or not info.get("sub"):
            self._log(UserAuthenticationLogType.GOOGLE_OAUTH, UserAuthenticationLogStatus.ERROR)
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Google sign-in failed.")

        email = info["email"]
        authentication = self._find_authentication(email, UserAuthenticationType.GOOGLE_OAUTH)
        now = _now()
        if authentication is None:
            user = self.session.exec(
                select(User).where(User.email == email, User.enabled.is_(True))
            ).first()
            if user is None:
                user = User(
                    email=email,
                    first_name=info.get("first_name"),
                    last_name=info.get("last_name"),
                    status=UserStatus.ACTIVE,
                    created_date=now,
                    created_ip=self.request_ip,
                    activation_date=now,
                )
                self.session.add(user)
                self.session.flush()
            authentication = UserAuthentication(
                type=UserAuthenticationType.GOOGLE_OAUTH,
                status=UserAuthenticationStatus.ACTIVE,
                email=email,
                value=info["sub"],
                user_id=user.id,
                created_date=now,
                activation_date=now,
                created_ip=self.request_ip,
            )
            self.session.add(authentication)
            self.session.flush()
        else:
            user = self._load_user(authentication.user_id)
            if user is None:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is not available.")

        return self._login_or_challenge(user, authentication, remember_me=False)


# argon2/base64 helper kept importable for the security manager.
def encode_base32_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")
