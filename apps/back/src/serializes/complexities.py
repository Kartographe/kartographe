# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for complexity estimates."""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import Field, computed_field

from src.models.enum import ComplexityMode, ComplexityScope, EntityType
from src.serializes._base import CamelBase
from src.serializes.entities import EntityRef
from src.serializes.users import OwnerItem
from src.utils.complexity import scope_for


class ComplexityItem(CamelBase):
    """A member's complexity estimate on an account entity."""

    date: datetime
    entity_id: uuid.UUID
    entity_type: EntityType
    id: uuid.UUID
    mode: ComplexityMode = Field(description="The scale the estimate was given on.")
    owner: OwnerItem
    owner_id: uuid.UUID
    value: Decimal | None = Field(
        default=None, description='The estimate; null means "cannot estimate yet".'
    )

    @computed_field(
        description="Which of the account's two scales this entity is estimated on."
    )
    @property
    def scope(self) -> ComplexityScope:
        return scope_for(self.entity_type)


class ComplexityListItem(ComplexityItem):
    """An estimate enriched with its resolved entity.

    `entity` is null when the target has been soft-deleted — the estimate still
    exists, its entity no longer does.
    """

    entity: EntityRef | None = None


class ComplexityScaleItem(CamelBase):
    """One of the account's two scales, and the values it accepts."""

    mode: ComplexityMode
    scope: ComplexityScope
    values: list[Decimal] = Field(
        description="Accepted values, ascending. `null` is accepted on top of them."
    )
