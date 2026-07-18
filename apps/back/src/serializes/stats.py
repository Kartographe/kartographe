# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for the account statistics dashboard endpoint.

A `StatsReport` carries, for every tracked entity, its all-time live count, how
many were created in the selected period, how many in the preceding sliding
window of equal length (yielding a delta), and a per-bucket series feeding a
sparkline.
"""

from datetime import date, datetime
from enum import Enum

from src.serializes._base import CamelBase


class StatsGranularity(str, Enum):
    """Bucket width of a metric's sparkline series."""

    DAY = "day"
    WEEK = "week"


class StatEntityKey(str, Enum):
    """The tracked entity a statistics metric counts."""

    APPLICATIONS = "applications"
    COMMENTS = "comments"
    DATABASES = "databases"
    FEATURES = "features"
    JOURNEYS = "journeys"
    PERSONAS = "personas"
    ROUTES = "routes"
    SCENARIOS = "scenarios"
    SERVICES = "services"
    VOTES = "votes"


class StatBucket(CamelBase):
    """One time bucket of a metric's series: the bucket's start day and the
    number of records created within it."""

    date: date
    value: int


class StatPeriod(CamelBase):
    """Inclusive datetime bounds of a comparison window."""

    lbound: datetime
    ubound: datetime


class StatMetric(CamelBase):
    """Counts for a single tracked entity over the selected period.

    `delta` is the relative change of `periodCount` against `previousCount`
    (`0.33` for +33%); it is null when the previous window is empty (no baseline
    to compare against).
    """

    delta: float | None = None
    key: StatEntityKey
    period_count: int
    previous_count: int
    series: list[StatBucket]
    total: int


class StatsReport(CamelBase):
    """Per-entity counts, deltas and sparkline series for the account dashboard."""

    granularity: StatsGranularity
    metrics: list[StatMetric]
    period: StatPeriod
    previous_period: StatPeriod
