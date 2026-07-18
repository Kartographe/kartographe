# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Account statistics: per-entity totals, period deltas and sparkline series.

Powers the account dashboard. For every tracked entity the manager reports the
all-time live count, how many were created in the selected period, how many in
the preceding sliding window of equal length (for a delta), and a per-bucket
series for a sparkline.

Counts and windows use the entity's business `date`, scoped to the account and
restricted to live (`enabled`) rows — the same rule the listings apply. The
period is inclusive on both bounds; the previous window is half-open
(`[previous_lower, lower)`) so the two never double-count the boundary. Series
buckets are materialised in Python from the period's `date` column, which keeps
the query portable and is cheap at dashboard scale.
"""

from collections import Counter
from datetime import date, datetime, timedelta

from sqlalchemy import func
from sqlmodel import Session, select

from src.models.account import Account
from src.models.application import Application
from src.models.application_route import ApplicationRoute
from src.models.comment import Comment
from src.models.database import Database
from src.models.feature import Feature
from src.models.journey import Journey
from src.models.journey_scenario import JourneyScenario
from src.models.persona import Persona
from src.models.service import Service
from src.models.vote import Vote
from src.serializes.stats import (
    StatBucket,
    StatEntityKey,
    StatMetric,
    StatPeriod,
    StatsGranularity,
    StatsReport,
)
from src.utils.datetime import to_naive_utc, utc_now

# Ordered (key, model). Every model carries `account_id` and a business `date`,
# so counting them scoped to an account is a flat filter — no joins.
_METRICS: list[tuple[StatEntityKey, type]] = [
    (StatEntityKey.FEATURES, Feature),
    (StatEntityKey.JOURNEYS, Journey),
    (StatEntityKey.SCENARIOS, JourneyScenario),
    (StatEntityKey.PERSONAS, Persona),
    (StatEntityKey.APPLICATIONS, Application),
    (StatEntityKey.DATABASES, Database),
    (StatEntityKey.SERVICES, Service),
    (StatEntityKey.ROUTES, ApplicationRoute),
    (StatEntityKey.COMMENTS, Comment),
    (StatEntityKey.VOTES, Vote),
]

# A period spanning up to this many days is bucketed by day; longer, by week.
_DAY_GRANULARITY_MAX_DAYS = 31
# Look-back applied when the caller passes no lower bound.
_DEFAULT_PERIOD_DAYS = 30


class StatsManager:
    def __init__(self, session: Session):
        self.session = session

    def report_for_account(
        self,
        account: Account,
        *,
        lbound: datetime | None = None,
        ubound: datetime | None = None,
    ) -> StatsReport:
        """Build the account's dashboard statistics over `[lbound, ubound]`.

        Both bounds default sensibly: `ubound` to now, `lbound` to 30 days
        before `ubound`. The previous window mirrors the period's length,
        ending where the period begins.
        """
        upper = to_naive_utc(ubound) or utc_now()
        lower = to_naive_utc(lbound) or (upper - timedelta(days=_DEFAULT_PERIOD_DAYS))
        span = upper - lower
        previous_lower = lower - span
        granularity = (
            StatsGranularity.DAY
            if span <= timedelta(days=_DAY_GRANULARITY_MAX_DAYS)
            else StatsGranularity.WEEK
        )
        starts = _bucket_starts(lower, upper, granularity)
        metrics = [
            self._metric(account, key, model, lower, upper, previous_lower, granularity, starts)
            for key, model in _METRICS
        ]
        return StatsReport(
            granularity=granularity,
            metrics=metrics,
            period=StatPeriod(lbound=lower, ubound=upper),
            previous_period=StatPeriod(lbound=previous_lower, ubound=lower),
        )

    def _metric(
        self,
        account: Account,
        key: StatEntityKey,
        model: type,
        lower: datetime,
        upper: datetime,
        previous_lower: datetime,
        granularity: StatsGranularity,
        starts: list[date],
    ) -> StatMetric:
        total = self._count(model.account_id == account.id, model.enabled.is_(True), model=model)
        previous_count = self._count(
            model.account_id == account.id,
            model.enabled.is_(True),
            model.date >= previous_lower,
            model.date < lower,
            model=model,
        )
        dates = self.session.exec(
            select(model.date).where(
                model.account_id == account.id,
                model.enabled.is_(True),
                model.date >= lower,
                model.date <= upper,
            )
        ).all()
        tally = Counter(_bucket_start(moment.date(), granularity) for moment in dates)
        series = [StatBucket(date=start, value=tally.get(start, 0)) for start in starts]
        period_count = len(dates)
        delta = (period_count - previous_count) / previous_count if previous_count else None
        return StatMetric(
            delta=delta,
            key=key,
            period_count=period_count,
            previous_count=previous_count,
            series=series,
            total=total,
        )

    def _count(self, *conditions, model: type) -> int:
        return self.session.exec(
            select(func.count()).select_from(model).where(*conditions)
        ).one()


def _bucket_start(day: date, granularity: StatsGranularity) -> date:
    """The day a bucket starts on: the day itself, or its ISO week's Monday."""
    if granularity == StatsGranularity.WEEK:
        return day - timedelta(days=day.weekday())
    return day


def _bucket_starts(lower: datetime, upper: datetime, granularity: StatsGranularity) -> list[date]:
    """Every bucket start from `lower` to `upper` inclusive, so the series has a
    fixed length and empty buckets read as zero rather than as gaps."""
    step = timedelta(days=7 if granularity == StatsGranularity.WEEK else 1)
    current = _bucket_start(lower.date(), granularity)
    end = upper.date()
    starts: list[date] = []
    while current <= end:
        starts.append(current)
        current += step
    return starts
