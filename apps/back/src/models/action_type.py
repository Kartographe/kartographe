"""The `action_type` table — global catalogue of step actions.

Reference data (not account-scoped), seeded by a data migration. Each row
describes an action a scenario step can perform and the shape of its
parameters (`parameter_schema`). The `slug` is unique and prefixed by the type
(e.g. `navigate.click`).
"""

from sqlalchemy import JSON
from sqlmodel import Field

from src.models._base import BaseModel
from src.models.enum import ActionTypeCategory


class ActionType(BaseModel, table=True):
    __tablename__ = "action_type"

    type: ActionTypeCategory = Field(index=True)
    slug: str = Field(unique=True, index=True)
    label: str
    # Shape hint for a step's `parameters`, e.g. {"url": "string"}.
    parameter_schema: dict = Field(sa_type=JSON)
