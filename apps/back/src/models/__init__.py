"""SQLModel tables.

Every persistent model must be imported here so that:
- `SQLModel.metadata` is populated for Alembic autogeneration,
- callers can do `from src.models import Foo` without wildcard imports.

No business tables yet — add them below as the schema grows.
"""

from src.models._base import BaseModel

__all__ = ["BaseModel"]
