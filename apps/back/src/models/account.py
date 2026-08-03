# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `account` table — a workspace users belong to via `AccountUser`.

An account is the tenancy boundary: every member holds a role (`AccountUser`)
and pending seats are tracked as invitations (`AccountUserInvitation`). Flat by
design — no company/establishment nesting.
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models._fields import CreatedIpFields
from src.models.enum import AccountStatus, ComplexityMode, Language

if TYPE_CHECKING:
    from src.models.account_user import AccountUser
    from src.models.account_user_invitation import AccountUserInvitation


class Account(BaseModel, CreatedIpFields, table=True):
    """A workspace / tenant."""

    __tablename__ = "account"

    status: AccountStatus = Field(default=AccountStatus.ACTIVE, index=True)
    language: Language = Field(default=Language.FRENCH, index=True)

    name: str = Field(index=True)
    picture_profile: str | None = Field(default=None)
    time_zone: str = Field(default="Europe/Paris")

    # The estimation scale each side of the account works on. Snapshotted onto
    # every `Complexity` row, so switching a mode never rewrites past estimates.
    technical_complexity_mode: ComplexityMode = Field(default=ComplexityMode.FIBONACCI)
    product_complexity_mode: ComplexityMode = Field(default=ComplexityMode.LINEAR)

    # Business-facing timestamps, distinct from BaseModel's internal ones.
    created_date: datetime | None = Field(default=None)
    status_date: datetime | None = Field(default=None)

    users: list["AccountUser"] = Relationship(back_populates="account")
    invitations: list["AccountUserInvitation"] = Relationship(back_populates="account")
