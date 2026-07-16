# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Account usage report — live-row counts per tracked entity, grouped by typology.

Each `UsageEntry` reports how many live (`enabled`) records the account holds for
one entity type, against a quota. File entities additionally report their
cumulative on-disk size against a storage quota. The quotas come from the
account's entitlements — flat Community ceilings in the AGPL core, the account's
licence once the Enterprise Edition is installed.

`key` is a `QuotaKey` value (`src/licensing/quotas.py`), typed here as a plain
string so the wire contract stays a string and the frontend keeps its own
label mapping.
"""

from src.serializes._base import CamelBase


class UsageEntry(CamelBase):
    """One tracked entity type: live-record count against its quota.

    `total_size` / `storage_limit` are only set for file entities (cumulative
    bytes stored and the storage cap); they stay `None` for every other entity.
    """

    count: int
    key: str
    limit: int
    storage_limit: int | None = None
    total_size: int | None = None


class UsageGroup(CamelBase):
    """A typology bucket grouping related entity counters (e.g. `applications`)."""

    entries: list[UsageEntry]
    key: str


class UsageReport(CamelBase):
    """The account's full usage breakdown, grouped by typology."""

    groups: list[UsageGroup]
