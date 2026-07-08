"""The `user_authentication_log` table — audit trail of every auth event."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models._fields import AuthenticationIpFields
from src.models.enum import UserAuthenticationLogStatus, UserAuthenticationLogType

if TYPE_CHECKING:
    from src.models.user import User
    from src.models.user_authentication import UserAuthentication
    from src.models.user_authentication_two_factor import UserAuthenticationTwoFactor


class UserAuthenticationLog(BaseModel, AuthenticationIpFields, table=True):
    """One row per authentication attempt (success, error or forbidden).

    `user_id` is nullable: a failed login for an unknown email still gets
    logged, with no user attached. The optional credential / second-factor FKs
    pinpoint which factor the event concerned when known.
    """

    __tablename__ = "user_authentication_log"

    type: UserAuthenticationLogType = Field(index=True)
    status: UserAuthenticationLogStatus = Field(index=True)
    date: datetime | None = Field(default=None)

    user_id: uuid.UUID | None = Field(default=None, foreign_key="user.id", index=True)
    user: Optional["User"] = Relationship(back_populates="authentication_logs")

    user_authentication_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="user_authentication.id",
        index=True,
    )
    user_authentication: Optional["UserAuthentication"] = Relationship()

    user_authentication_two_factor_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="user_authentication_two_factor.id",
        index=True,
    )
    user_authentication_two_factor: Optional["UserAuthenticationTwoFactor"] = Relationship()
