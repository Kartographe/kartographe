"""Output schemas for the global reference catalogues (action & assertion types)."""

import uuid

from src.models.enum import ActionTypeCategory, AssertionTypeCategory
from src.serializes._base import CamelBase


class ActionTypeItem(CamelBase):
    """A catalogued step action and the shape of its parameters."""

    id: uuid.UUID
    label: str
    parameter_schema: dict
    slug: str
    type: ActionTypeCategory


class AssertionTypeItem(CamelBase):
    """A catalogued step assertion and the shape of its parameters."""

    id: uuid.UUID
    label: str
    parameter_schema: dict
    slug: str
    type: AssertionTypeCategory
