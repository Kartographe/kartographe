# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Guards on the complexity scales.

The scales are the contract of the estimate endpoints: a value is accepted only
if it is on the account's scale. These check the tables themselves — every mode
has a scale, every entity type has a scope, and membership is decided on the
numeric value (so `2` and `2.00` are the same card).
"""

from decimal import Decimal

import pytest

from src.models.enum import (
    ComplexityLevel,
    ComplexityMode,
    ComplexityScope,
    EntityType,
)
from src.utils.complexity import (
    COMPLEXITY_SCALES,
    COMPLEXITY_SCOPES,
    allowed_values,
    is_allowed,
    level_for,
    scope_for,
)


def test_every_mode_has_a_scale():
    assert set(COMPLEXITY_SCALES) == set(ComplexityMode)


def test_every_entity_type_has_a_scope():
    assert set(COMPLEXITY_SCOPES) == set(EntityType)
    assert set(COMPLEXITY_SCOPES.values()) == set(ComplexityScope)


def test_scales_hold_the_expected_cards():
    assert allowed_values(ComplexityMode.FIBONACCI) == tuple(
        Decimal(v) for v in (1, 2, 3, 5, 8, 13, 21, 34, 55, 89)
    )
    assert allowed_values(ComplexityMode.POWERS_OF_TWO) == tuple(
        Decimal(v) for v in (1, 2, 4, 8, 16, 32)
    )
    assert allowed_values(ComplexityMode.LINEAR) == tuple(Decimal(v) for v in range(1, 11))
    assert Decimal("0.5") in allowed_values(ComplexityMode.MODIFIED_FIBONACCI)


@pytest.mark.parametrize(
    ("mode", "value", "expected"),
    [
        (ComplexityMode.FIBONACCI, Decimal(8), True),
        # Trailing zeros are a formatting detail, not a different card.
        (ComplexityMode.FIBONACCI, Decimal("8.00"), True),
        (ComplexityMode.FIBONACCI, Decimal(4), False),
        (ComplexityMode.MODIFIED_FIBONACCI, Decimal("0.5"), True),
        (ComplexityMode.MODIFIED_FIBONACCI, Decimal(21), False),
        (ComplexityMode.POWERS_OF_TWO, Decimal(16), True),
        (ComplexityMode.POWERS_OF_TWO, Decimal(3), False),
        (ComplexityMode.LINEAR, Decimal(10), True),
        (ComplexityMode.LINEAR, Decimal(11), False),
        # "Cannot estimate yet" is accepted on every scale.
        (ComplexityMode.FIBONACCI, None, True),
        (ComplexityMode.LINEAR, None, True),
    ],
)
def test_is_allowed(mode, value, expected):
    assert is_allowed(mode, value) is expected


def test_scope_split():
    assert scope_for(EntityType.APPLICATION) == ComplexityScope.TECHNICAL
    assert scope_for(EntityType.DATABASE_TABLE) == ComplexityScope.TECHNICAL
    assert scope_for(EntityType.SERVICE_ACTION) == ComplexityScope.TECHNICAL
    assert scope_for(EntityType.FEATURE) == ComplexityScope.PRODUCT
    assert scope_for(EntityType.PERSONA) == ComplexityScope.PRODUCT
    assert scope_for(EntityType.JOURNEY_SCENARIO_STEP) == ComplexityScope.PRODUCT


@pytest.mark.parametrize(
    ("mode", "value", "expected"),
    [
        # The weight comes from the position in the scale, not from the number:
        # a 13 on Fibonacci and an 8 on powers of two read the same.
        (ComplexityMode.FIBONACCI, Decimal(1), ComplexityLevel.NONE),
        (ComplexityMode.FIBONACCI, Decimal(8), ComplexityLevel.MEDIUM),
        (ComplexityMode.FIBONACCI, Decimal(89), ComplexityLevel.EXTREME),
        (ComplexityMode.POWERS_OF_TWO, Decimal(8), ComplexityLevel.MEDIUM),
        (ComplexityMode.POWERS_OF_TWO, Decimal(32), ComplexityLevel.EXTREME),
        (ComplexityMode.LINEAR, Decimal(1), ComplexityLevel.NONE),
        (ComplexityMode.LINEAR, Decimal(10), ComplexityLevel.EXTREME),
        (ComplexityMode.MODIFIED_FIBONACCI, Decimal("0.5"), ComplexityLevel.NONE),
        # An average lands between two cards — it takes the nearest one.
        (ComplexityMode.FIBONACCI, Decimal("7.5"), ComplexityLevel.MEDIUM),
        (ComplexityMode.FIBONACCI, Decimal("120"), ComplexityLevel.EXTREME),
        # "Cannot estimate yet" is not a weight.
        (ComplexityMode.FIBONACCI, None, None),
    ],
)
def test_level_for(mode, value, expected):
    assert level_for(mode, value) is expected
