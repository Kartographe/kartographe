"""Input schemas for the `/auth/*` surface."""

from typing import Any

from pydantic import EmailStr, Field

from src.forms._base import CamelBase
from src.models.enum import Language, UserGender


class RegisterForm(CamelBase):
    """Sign-up payload for a new email/password account."""

    email: EmailStr = Field(description="Email address the account is created with.", examples=["ada@example.com"])
    first_name: str = Field(min_length=1, max_length=100, description="Given name.", examples=["Ada"])
    last_name: str = Field(min_length=1, max_length=100, description="Family name.", examples=["Lovelace"])
    gender: UserGender = Field(default=UserGender.UNKNOWN, description="Salutation preference.")
    language: Language = Field(default=Language.FRENCH, description="Preferred interface / email language.")
    password: str = Field(
        min_length=8,
        max_length=100,
        description="At least 8 characters.",
        examples=["correct-horse-battery-staple"],
    )


class ActivationForm(CamelBase):
    """Confirm an account from the link sent by email."""

    token: str = Field(min_length=1, description="Activation token from the email link.")


class ResendActivationForm(CamelBase):
    """Ask for a fresh activation email."""

    email: EmailStr = Field(description="Email of the account to re-send activation to.")


class LoginForm(CamelBase):
    """Email/password login."""

    email: EmailStr = Field(description="Account email.", examples=["ada@example.com"])
    password: str = Field(min_length=1, description="Account password.")
    remember_me: bool = Field(default=False, description="Keep the session alive longer on this device.")


class TwoFactorForm(CamelBase):
    """Second-factor step: exchange the intermediate token for a full session."""

    token: str = Field(description="Intermediate token returned by the login step.")
    value: str = Field(description="The 6-digit code (authenticator) or a recovery code.", examples=["123456"])


class RefreshTokenForm(CamelBase):
    """Trade a refresh token for a fresh access token."""

    grant_type: str = Field(pattern="^refresh_token$", description="Always `refresh_token`.", examples=["refresh_token"])
    refresh_token: str = Field(description="A valid refresh token.")


class ForgotPasswordForm(CamelBase):
    """Request a password-reset email."""

    email: EmailStr = Field(description="Email to send the reset link to.")


class ResetPasswordForm(CamelBase):
    """Set a new password from a reset link."""

    token: str = Field(min_length=1, description="Reset token from the email link.")
    password: str = Field(min_length=8, max_length=100, description="The new password, at least 8 characters.")


class GoogleSsoForm(CamelBase):
    """Sign in / link via Google."""

    google_token: str = Field(description="The Google ID token obtained in the browser.")


class U2FAssertionOptionsForm(CamelBase):
    """Start a security-key login: request the WebAuthn assertion options."""

    token: str = Field(description="Intermediate token returned by the login step.")


class U2FAssertionVerifyForm(CamelBase):
    """Finish a security-key login with the browser's assertion."""

    assertion_token: str = Field(description="Assertion token returned by the options step.")
    credential: dict[str, Any] = Field(description="The raw WebAuthn `PublicKeyCredential` from the browser.")
