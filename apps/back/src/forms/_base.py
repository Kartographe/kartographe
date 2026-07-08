"""Shared base for input schemas (`src/forms/`, `src/filters/`).

Mirror of the serializer `CamelBase`: the front sends camelCase, Python reads
snake_case. `str_strip_whitespace` trims incoming strings so `" a@b.co "`
validates as `a@b.co`.
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        str_strip_whitespace=True,
    )
