"""Shared query-parameter primitives for listing endpoints.

Listings accept a page cursor, a page size (constrained to a fixed set), and a
sort direction. Feature-specific filters add their own sortable fields and
enum[] filters on top (see e.g. `filters/accounts.py`).
"""

from enum import Enum


class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"


class PageLimit(int, Enum):
    """Allowed page sizes — the front offers exactly these."""

    L10 = 10
    L25 = 25
    L50 = 50
    L100 = 100
