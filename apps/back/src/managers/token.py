"""JWT token managers.

Every token is an HS256 JWT signed with `JWT_SECRET`, carrying the standard
`iss/sub/aud/iat/nbf/exp` claims. The **audience** separates token kinds so one
kind can never stand in for another:

- `app`               — access token (the only one `get_current_user` accepts).
- `app-refresh`       — refresh token, traded for a new pair at `/v1/auth/refresh`.
- `auth-two-factor`   — short-lived, issued after a correct password when a
                        second factor is still required.
- `auth-two-factor-u2f` — 5-min challenge token for a security-key assertion.
- `auth-activation`   — emailed link to confirm a new account.
- `auth-reset-password` — emailed link to reset a password.

Access/2FA tokens embed the user's `token_control`; rotating that column
(on password reset) invalidates every previously issued token at once.
"""

import time
import uuid

import jwt

from src.models.user import User
from src.models.user_authentication import UserAuthentication
from src.settings import get_settings

_SUBJECT = "user"


def _now() -> int:
    return int(time.time())


def _encode(audience: str, ttl: int, extra: dict) -> str:
    settings = get_settings()
    now = _now()
    claims = {
        "iss": settings.jwt_issuer,
        "sub": _SUBJECT,
        "aud": audience,
        "iat": now,
        "nbf": now,
        "exp": now + ttl,
        **extra,
    }
    return jwt.encode(claims, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode(token: str, audience: str) -> tuple[dict | None, bool]:
    """Return `(payload, expired)`. `payload` is None on any invalid token;
    `expired` is True only when the token was well-formed but past `exp`."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            audience=audience,
            issuer=settings.jwt_issuer,
            options={"require": ["exp", "iat", "nbf", "aud", "iss", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        return None, True
    except jwt.PyJWTError:
        return None, False
    if payload.get("sub") != _SUBJECT:
        return None, False
    return payload, False


class UserTokenManager:
    """Issues and validates the access + refresh pair for an authenticated user."""

    ACCESS_AUDIENCE = "app"
    REFRESH_AUDIENCE = "app-refresh"

    def __init__(self, user: User, remember_me: bool = False):
        self.user = user
        self.remember_me = remember_me

    def _user_claim(self) -> dict:
        return {"user": {"id": str(self.user.id), "tokenControl": self.user.token_control}}

    def generate(self) -> dict:
        settings = get_settings()
        access_ttl = settings.jwt_access_ttl_seconds
        refresh_ttl = settings.jwt_refresh_long_ttl_seconds if self.remember_me else settings.jwt_refresh_ttl_seconds
        access = _encode(self.ACCESS_AUDIENCE, access_ttl, {**self._user_claim(), "rememberMe": self.remember_me})
        refresh = _encode(self.REFRESH_AUDIENCE, refresh_ttl, {**self._user_claim(), "rememberMe": self.remember_me})
        return {
            "token_type": "Bearer",
            "expires_in": access_ttl,
            "access_token": access,
            "refresh_token": refresh,
            "refresh_token_expires_in": refresh_ttl,
        }

    @classmethod
    def decode_access(cls, token: str) -> tuple[dict | None, bool]:
        return _decode(token, cls.ACCESS_AUDIENCE)

    @classmethod
    def decode_refresh(cls, token: str) -> tuple[dict | None, bool]:
        return _decode(token, cls.REFRESH_AUDIENCE)


class TwoFactorTokenManager:
    """Short-lived intermediate token proving the password step succeeded."""

    AUDIENCE = "auth-two-factor"
    TTL = 300

    def __init__(self, user: User):
        self.user = user

    def generate(self) -> str:
        return _encode(self.AUDIENCE, self.TTL, {"user": {"id": str(self.user.id), "tokenControl": self.user.token_control}})

    @classmethod
    def decode(cls, token: str) -> tuple[dict | None, bool]:
        return _decode(token, cls.AUDIENCE)


class U2FChallengeTokenManager:
    """5-minute token binding a WebAuthn challenge to a pending login."""

    AUDIENCE = "auth-two-factor-u2f"
    TTL = 300

    def __init__(self, user: User, challenge: str | None = None):
        self.user = user
        self.challenge = challenge

    def generate(self) -> str:
        return _encode(
            self.AUDIENCE,
            self.TTL,
            {"user": {"id": str(self.user.id)}, "u2f": {"challenge": self.challenge}},
        )

    @classmethod
    def decode(cls, token: str) -> tuple[dict | None, bool]:
        return _decode(token, cls.AUDIENCE)


class U2FRegistrationTokenManager:
    """5-minute token binding a WebAuthn *registration* challenge to a user.

    Used by the security area to enrol a new key (distinct audience from the
    login-time assertion challenge so the two can't be swapped).
    """

    AUDIENCE = "me-two-factor-u2f-register"
    TTL = 300

    def __init__(self, user: User, challenge: str | None = None):
        self.user = user
        self.challenge = challenge

    def generate(self) -> str:
        return _encode(
            self.AUDIENCE,
            self.TTL,
            {"user": {"id": str(self.user.id)}, "u2f": {"challenge": self.challenge}},
        )

    @classmethod
    def decode(cls, token: str) -> tuple[dict | None, bool]:
        return _decode(token, cls.AUDIENCE)


class _TemporaryAuthenticationTokenManager:
    """Base for emailed one-shot links tied to a `UserAuthentication` row."""

    AUDIENCE = "auth-temporary"
    TTL = 86400

    def __init__(self, user_authentication: UserAuthentication):
        self.user_authentication = user_authentication

    def generate(self) -> str:
        return _encode(self.AUDIENCE, self.TTL, {"userAuthentication": {"id": str(self.user_authentication.id)}})

    @classmethod
    def decode(cls, token: str) -> tuple[dict | None, bool]:
        return _decode(token, cls.AUDIENCE)

    @staticmethod
    def extract_authentication_id(payload: dict) -> uuid.UUID | None:
        raw = (payload.get("userAuthentication") or {}).get("id")
        if not raw:
            return None
        try:
            return uuid.UUID(raw)
        except (ValueError, TypeError):
            return None


class ActivationTokenManager(_TemporaryAuthenticationTokenManager):
    AUDIENCE = "auth-activation"


class ResetTokenManager(_TemporaryAuthenticationTokenManager):
    AUDIENCE = "auth-reset-password"
