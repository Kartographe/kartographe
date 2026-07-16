# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for the current-user security area (`/me/security`)."""

from typing import Any

from pydantic import Field

from src.forms._base import CamelBase


class CreatePasswordForm(CamelBase):
    """Set a password on an account that has none yet (e.g. Google-only)."""

    password: str = Field(min_length=8, max_length=100)


class UpdatePasswordForm(CamelBase):
    """Change the existing password."""

    old_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=100)


class ActivateOtpForm(CamelBase):
    """Confirm a freshly generated authenticator secret with a live code."""

    code: str = Field(pattern=r"^\d{6}$", description="The current 6-digit authenticator code.", examples=["123456"])


class U2FRegistrationVerifyForm(CamelBase):
    """Finish registering a security key with the browser's attestation."""

    registration_token: str = Field(description="Token returned by the registration-options step.")
    credential: dict[str, Any] = Field(description="The raw WebAuthn `PublicKeyCredential` from the browser.")
    nickname: str | None = Field(default=None, max_length=60, description="A label for this key.")


class RenameSecurityKeyForm(CamelBase):
    """Rename a registered security key."""

    nickname: str = Field(min_length=1, max_length=60)
