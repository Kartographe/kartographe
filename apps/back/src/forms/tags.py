"""Input schemas for tags."""

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import TagEntityType


class TagCreateForm(CamelBase):
    """Create a tag for a given entity type."""

    entity_type: TagEntityType
    label: str = Field(min_length=1, max_length=255)
    background_color: str = Field(min_length=1, max_length=32)
    text_color: str = Field(min_length=1, max_length=32)


class TagPatchForm(CamelBase):
    """Partial update of a tag — its label and colors (not its entity type)."""

    label: str | None = Field(default=None, min_length=1, max_length=255)
    background_color: str | None = Field(default=None, min_length=1, max_length=32)
    text_color: str | None = Field(default=None, min_length=1, max_length=32)
