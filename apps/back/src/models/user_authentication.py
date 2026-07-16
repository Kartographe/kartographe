# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `user_authentication` table — one credential per (type, email)."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models._fields import ActivationIpFields, CreatedIpFields, LastAuthenticationIpFields
from src.models.enum import UserAuthenticationStatus, UserAuthenticationType

if TYPE_CHECKING:
    from src.models.user import User


class UserAuthentication(
    BaseModel,
    CreatedIpFields,
    ActivationIpFields,
    LastAuthenticationIpFields,
    table=True,
):
    """A single way for a user to authenticate.

    `value` holds the argon2 password hash for `EMAIL_PASSWORD`, or the external
    provider subject id for `GOOGLE_OAUTH`. A user may own several rows (a
    password plus a linked Google account), one per `type`.
    """

    __tablename__ = "user_authentication"
    __table_args__ = (UniqueConstraint("type", "email", name="unique_user_authentication"),)

    type: UserAuthenticationType = Field(index=True)
    status: UserAuthenticationStatus = Field(default=UserAuthenticationStatus.NOT_VERIFIED, index=True)
    email: str = Field(index=True)
    value: str | None = Field(default=None)

    created_date: datetime | None = Field(default=None)
    activation_date: datetime | None = Field(default=None)
    last_authentication_date: datetime | None = Field(default=None)

    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    user: "User" = Relationship(back_populates="authentications")
