"""SQLModel tables.

Every persistent model must be imported here so that:
- `SQLModel.metadata` is populated for Alembic autogeneration,
- callers can do `from src.models import Foo` without wildcard imports.
"""

from src.models._base import BaseModel
from src.models.user import User
from src.models.user_authentication import UserAuthentication
from src.models.user_authentication_log import UserAuthenticationLog
from src.models.user_authentication_two_factor import UserAuthenticationTwoFactor

__all__ = [
    "BaseModel",
    "User",
    "UserAuthentication",
    "UserAuthenticationLog",
    "UserAuthenticationTwoFactor",
]
