"""Input schemas for personas."""

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import PersonaType


class PersonaCreateForm(CamelBase):
    """Create a persona. It starts as a draft."""

    type: PersonaType
    title: str = Field(min_length=1, max_length=255)
    description: dict | None = Field(default=None)


class PersonaPatchForm(CamelBase):
    """Partial update of a persona — only the keys sent are applied."""

    type: PersonaType | None = Field(default=None)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: dict | None = Field(default=None)
