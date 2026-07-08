"""The `user_authentication_two_factor` table — second factors per user."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Column
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models._fields import ActivationIpFields, LastAuthenticationIpFields
from src.models.enum import UserAuthenticationTwoFactorStatus, UserAuthenticationTwoFactorType

if TYPE_CHECKING:
    from src.models.user import User


class UserAuthenticationTwoFactor(BaseModel, ActivationIpFields, LastAuthenticationIpFields, table=True):
    """A registered second factor.

    `value` meaning depends on `type`:
    - `OTP` — base32 TOTP secret.
    - `RECOVERY_CODE` — the one-time code itself (flipped to `USED` on use).
    - `U2F` — the base64url WebAuthn credential id.

    `data` carries the WebAuthn challenge while a key is `NOT_VERIFIED`, then the
    stored credential metadata (`public_key`, `sign_count`, `transports`,
    `nickname`) once active. It stays null for OTP and recovery codes.
    """

    __tablename__ = "user_authentication_two_factor"

    type: UserAuthenticationTwoFactorType = Field(index=True)
    status: UserAuthenticationTwoFactorStatus = Field(
        default=UserAuthenticationTwoFactorStatus.NOT_VERIFIED,
        index=True,
    )
    value: str = Field(index=True)
    data: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))

    date: datetime | None = Field(default=None)
    activation_date: datetime | None = Field(default=None)
    last_authentication_date: datetime | None = Field(default=None)

    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    user: "User" = Relationship(back_populates="two_factors")
