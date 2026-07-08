"""Datetime helpers.

The business-facing timestamp columns (`date`, `start_date`, `expire_date`, …)
are `timestamp without time zone`, so we work in **naive UTC** everywhere to
avoid mixing aware/naive values in comparisons.
"""

from datetime import UTC, datetime

# Sentinel `end_date` for an open-ended membership (far enough to never elapse).
FAR_FUTURE = datetime(9999, 12, 31, 23, 59, 59)


def utc_now() -> datetime:
    """Current UTC instant as a naive datetime (matches the DB columns)."""
    return datetime.now(UTC).replace(tzinfo=None)
