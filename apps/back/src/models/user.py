# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `user` table — one row per human or machine account."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models._fields import ActivationIpFields, CreatedIpFields, LastAuthenticationIpFields
from src.models.enum import Language, UserGender, UserStatus, UserTheme, UserType

if TYPE_CHECKING:
    from src.models.user_authentication import UserAuthentication
    from src.models.user_authentication_log import UserAuthenticationLog
    from src.models.user_authentication_two_factor import UserAuthenticationTwoFactor


class User(BaseModel, CreatedIpFields, ActivationIpFields, LastAuthenticationIpFields, table=True):
    """A user account.

    Identity data only — credentials live in `UserAuthentication`, second
    factors in `UserAuthenticationTwoFactor`, and every auth event in
    `UserAuthenticationLog`. `token_control` is an opaque server-side value
    embedded in every issued access token; rotating it invalidates all
    previously minted tokens at once (used on password reset).
    """

    __tablename__ = "user"

    gender: UserGender = Field(default=UserGender.UNKNOWN, index=True)
    type: UserType = Field(default=UserType.PHYSICAL, index=True)
    status: UserStatus = Field(default=UserStatus.ACTIVE, index=True)
    language: Language = Field(default=Language.FRENCH, index=True)
    theme: UserTheme = Field(default=UserTheme.SYSTEM)

    email: str = Field(index=True)
    phone: str | None = Field(default=None, index=True)
    first_name: str | None = Field(default=None)
    last_name: str | None = Field(default=None)
    picture_profile: str | None = Field(default=None)

    # Business-facing timestamps, distinct from BaseModel's internal
    # created_at/updated_at (which are never exposed).
    created_date: datetime | None = Field(default=None)
    activation_date: datetime | None = Field(default=None)
    last_authentication_date: datetime | None = Field(default=None)

    # Rotated (via `secrets.token_hex`) to revoke every issued access token.
    token_control: str | None = Field(default=None)

    authentications: list["UserAuthentication"] = Relationship(back_populates="user")
    two_factors: list["UserAuthenticationTwoFactor"] = Relationship(back_populates="user")
    authentication_logs: list["UserAuthenticationLog"] = Relationship(back_populates="user")
