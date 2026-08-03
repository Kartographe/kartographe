# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Complexity scales, and which scale an entity is estimated on.

Pure data + lookups: no FastAPI, no session. Two things live here —

- **the scales**: the values each `ComplexityMode` accepts. `None` ("no
  estimate") is accepted by every mode and is therefore not listed.
- **the scope map**: which of the account's two modes applies to a given
  entity. Exhaustive over `EntityType` by construction (asserted below), so a
  new entity type cannot silently fall through to a default.
"""

from decimal import Decimal

from src.models.enum import ComplexityMode, ComplexityScope, EntityType

# The values each scale accepts, ascending. `None` is always allowed on top of
# these — it is the "cannot estimate yet" card, not a scale value.
COMPLEXITY_SCALES: dict[ComplexityMode, tuple[Decimal, ...]] = {
    ComplexityMode.FIBONACCI: tuple(
        Decimal(value) for value in (1, 2, 3, 5, 8, 13, 21, 34, 55, 89)
    ),
    ComplexityMode.MODIFIED_FIBONACCI: (
        Decimal(0),
        Decimal("0.5"),
        *(Decimal(value) for value in (1, 2, 3, 5, 8, 13, 20, 40, 100)),
    ),
    ComplexityMode.POWERS_OF_TWO: tuple(Decimal(value) for value in (1, 2, 4, 8, 16, 32)),
    ComplexityMode.LINEAR: tuple(Decimal(value) for value in range(1, 11)),
}

# Technical entities are estimated by the build side, product entities by the
# product side; each scope carries its own mode on the account.
COMPLEXITY_SCOPES: dict[EntityType, ComplexityScope] = {
    EntityType.APPLICATION: ComplexityScope.TECHNICAL,
    EntityType.APPLICATION_ROUTE: ComplexityScope.TECHNICAL,
    EntityType.APPLICATION_COMPONENT: ComplexityScope.TECHNICAL,
    EntityType.DATABASE: ComplexityScope.TECHNICAL,
    EntityType.DATABASE_TABLE: ComplexityScope.TECHNICAL,
    EntityType.DATABASE_TABLE_COLUMN: ComplexityScope.TECHNICAL,
    EntityType.DATABASE_MIGRATION: ComplexityScope.TECHNICAL,
    EntityType.DATABASE_MIGRATION_COLUMN: ComplexityScope.TECHNICAL,
    EntityType.SERVICE: ComplexityScope.TECHNICAL,
    EntityType.SERVICE_ACTION: ComplexityScope.TECHNICAL,
    EntityType.FEATURE: ComplexityScope.PRODUCT,
    EntityType.PERSONA: ComplexityScope.PRODUCT,
    EntityType.JOURNEY: ComplexityScope.PRODUCT,
    EntityType.JOURNEY_SCENARIO: ComplexityScope.PRODUCT,
    EntityType.JOURNEY_SCENARIO_STEP: ComplexityScope.PRODUCT,
}

# Locked in lock-step with `EntityType`: adding an entity type without deciding
# which side estimates it is a bug, not a default.
assert set(COMPLEXITY_SCOPES) == set(EntityType), (
    "COMPLEXITY_SCOPES must cover every EntityType"
)


def scope_for(entity_type: EntityType) -> ComplexityScope:
    """Which of the account's two scales estimates this kind of entity."""
    return COMPLEXITY_SCOPES[entity_type]


def allowed_values(mode: ComplexityMode) -> tuple[Decimal, ...]:
    """The scale's values, ascending (`None` is allowed on top of them)."""
    return COMPLEXITY_SCALES[mode]


def is_allowed(mode: ComplexityMode, value: Decimal | None) -> bool:
    """Whether `value` belongs to the scale. `None` always does."""
    if value is None:
        return True
    return any(value == allowed for allowed in COMPLEXITY_SCALES[mode])


def format_scale(mode: ComplexityMode) -> str:
    """The scale as a human-readable list, for error messages and docs."""
    values = ", ".join(format(value.normalize(), "f") for value in COMPLEXITY_SCALES[mode])
    return f"{values} or null"
