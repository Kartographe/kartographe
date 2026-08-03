# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for complexity estimates."""

import uuid
from decimal import Decimal

from pydantic import Field

from src.forms._base import CamelBase
from src.models.enum import EntityType

_VALUE_DESCRIPTION = (
    "The estimate, on the account's scale for this kind of entity — Fibonacci "
    "(1, 2, 3, 5, 8, 13, 21, 34, 55, 89), modified Fibonacci (0, 0.5, 1, 2, 3, 5, 8, "
    "13, 20, 40, 100), powers of two (1, 2, 4, 8, 16, 32) or linear (1 to 10). Send "
    "`null` for \"cannot estimate yet\". A value outside the account's scale is refused."
)


class ComplexityUpsertForm(CamelBase):
    """Give (or update) the caller's complexity estimate on an entity.

    Only the value is provided; the scale (`mode`) is snapshotted server-side
    from the account's setting for the entity's scope.
    """

    value: Decimal | None = Field(default=None, description=_VALUE_DESCRIPTION)


class ComplexityCastForm(ComplexityUpsertForm):
    """Estimate any entity through the account-wide endpoint.

    Same value-only shape as the per-entity form, plus the polymorphic target
    (`entityType` + `entityId`) — validated server-side against the account.
    """

    entity_type: EntityType = Field(description="The kind of entity being estimated.")
    entity_id: uuid.UUID = Field(description="The id of the entity being estimated.")
