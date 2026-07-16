# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for the current-user security area (`/me/security`)."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import Field

from src.models.enum import UserAuthenticationLogStatus, UserAuthenticationLogType
from src.serializes._base import CamelBase


class SecurityOverviewItem(CamelBase):
    """Snapshot of the account's credentials and second factors."""

    google_linked: bool
    has_password: bool
    otp_enabled: bool
    recovery_codes_remaining: int
    security_keys_count: int
    two_factor_enabled: bool


class OtpMethodItem(CamelBase):
    """An active authenticator registered on the account."""

    id: uuid.UUID
    registered_at: datetime | None = None


class OtpProvisioningItem(CamelBase):
    """A pending authenticator secret — shown once, then confirmed with a code."""

    id: uuid.UUID
    provisioning_uri: str = Field(description="`otpauth://` URI to render as a QR code.")
    secret: str = Field(description="The base32 secret, for manual entry.")


class RecoveryCodesItem(CamelBase):
    """One-time recovery codes — displayed once, never retrievable again."""

    codes: list[str]


class SecurityKeyItem(CamelBase):
    """A registered WebAuthn security key."""

    id: uuid.UUID
    last_used_at: datetime | None = None
    nickname: str | None = None
    registered_at: datetime | None = None


class U2FRegistrationOptionsItem(CamelBase):
    """WebAuthn creation options plus the token binding them to this session."""

    options: dict[str, Any] = Field(description="`PublicKeyCredentialCreationOptions` for `navigator.credentials.create`.")
    registration_token: str


class SecurityLogItem(CamelBase):
    """One authentication-log entry."""

    date: datetime | None = None
    id: uuid.UUID
    ip: str | None = None
    status: UserAuthenticationLogStatus
    type: UserAuthenticationLogType
