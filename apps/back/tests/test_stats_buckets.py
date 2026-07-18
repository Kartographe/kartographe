# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Unit tests for the statistics sparkline bucketing helpers.

The account dashboard's sparkline series are materialised in Python, so the
bucket maths (day vs week alignment, inclusive bounds, zero-filled gaps) is the
part worth locking down independently of the database.
"""

from datetime import date, datetime

from src.managers.stats import _bucket_start, _bucket_starts
from src.serializes.stats import StatsGranularity


def test_bucket_start_day_is_identity():
    day = date(2026, 7, 15)
    assert _bucket_start(day, StatsGranularity.DAY) == day


def test_bucket_start_week_snaps_to_monday():
    # 2026-07-15 is a Wednesday; its ISO week starts Monday 2026-07-13.
    assert _bucket_start(date(2026, 7, 15), StatsGranularity.WEEK) == date(2026, 7, 13)
    # A Monday snaps to itself.
    assert _bucket_start(date(2026, 7, 13), StatsGranularity.WEEK) == date(2026, 7, 13)


def test_daily_buckets_span_inclusive_bounds():
    lower = datetime(2026, 7, 1, 9, 0)
    upper = datetime(2026, 7, 5, 18, 0)
    starts = _bucket_starts(lower, upper, StatsGranularity.DAY)
    assert starts == [
        date(2026, 7, 1),
        date(2026, 7, 2),
        date(2026, 7, 3),
        date(2026, 7, 4),
        date(2026, 7, 5),
    ]


def test_weekly_buckets_are_monday_aligned_and_inclusive():
    # Wed 2026-07-01 → Wed 2026-07-15 spans three ISO weeks.
    lower = datetime(2026, 7, 1, 0, 0)
    upper = datetime(2026, 7, 15, 0, 0)
    starts = _bucket_starts(lower, upper, StatsGranularity.WEEK)
    assert starts == [date(2026, 6, 29), date(2026, 7, 6), date(2026, 7, 13)]


def test_single_day_period_yields_one_bucket():
    moment = datetime(2026, 7, 10, 12, 0)
    assert _bucket_starts(moment, moment, StatsGranularity.DAY) == [date(2026, 7, 10)]
