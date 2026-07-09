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


def to_naive_utc(value: datetime | None) -> datetime | None:
    """Normalise a client-supplied datetime to naive UTC.

    Query params may carry an offset (`2026-01-01T09:00:00+02:00`). Comparing an
    aware value against a `timestamp without time zone` column would let the
    session timezone decide the result, so convert to UTC and drop the tzinfo.
    """
    if value is None or value.tzinfo is None:
        return value
    return value.astimezone(UTC).replace(tzinfo=None)
