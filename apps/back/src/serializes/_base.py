# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Shared serializer base + response envelopes.

Every output schema in `src/serializes/` inherits `CamelBase` so the exposed
JSON is camelCase while the Python code stays snake_case (PEP 8). Responses are
never the bare model — they are wrapped in one of the envelopes below so the
front always reads `response.item` / `response.items`, leaving room to add
metadata later without breaking the contract.
"""

import math
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class CamelBase(BaseModel):
    """Base for all serializers: camelCase aliases, populate by field name too."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class ItemResponse(CamelBase, Generic[T]):
    """Single-resource envelope: `{ "item": … }`."""

    item: T


class Pagination(CamelBase):
    """Page cursor for a listing: 1-based, clamped to `[min, max]`."""

    min: int = 1
    current: int
    max: int


class ListingResponse(CamelBase, Generic[T]):
    """Collection envelope: `{ count, limit, page, items[] }`."""

    count: int
    limit: int
    page: Pagination
    items: list[T]

    @classmethod
    def single_page(cls, items: list) -> "ListingResponse":
        """Wrap an already-materialised, non-paginated list in the envelope."""
        return cls(
            count=len(items),
            limit=len(items) or 1,
            page=Pagination(min=1, current=1, max=1),
            items=items,
        )

    @classmethod
    def paginate(cls, items: list, *, count: int, page: int, limit: int) -> "ListingResponse":
        """Wrap one page of a server-paginated query in the envelope."""
        max_page = max(1, math.ceil(count / limit)) if limit else 1
        return cls(
            count=count,
            limit=limit,
            page=Pagination(min=1, current=page, max=max_page),
            items=items,
        )


class SuccessResponse(CamelBase):
    """Body of an action endpoint that has nothing to return but success."""

    status: str = "ok"
