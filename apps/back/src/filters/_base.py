# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Shared query-parameter primitives for listing endpoints.

Listings accept a page cursor, a page size (constrained to a fixed set), and a
sort direction. Feature-specific filters add their own sortable fields and
enum[] filters on top (see e.g. `filters/accounts.py`).
"""

from enum import Enum
from typing import Annotated

from fastapi import Query

from src.models.enum import VoteValue

# Shared `myVote` listing filter: one of the vote values (entities the caller
# voted that way) or `none` (entities the caller has not voted on).
_MY_VOTE_PATTERN = "^(" + "|".join([v.value for v in VoteValue] + ["none"]) + ")$"
MyVoteFilter = Annotated[
    str | None,
    Query(
        alias="myVote",
        pattern=_MY_VOTE_PATTERN,
        description="Keep only entities the caller voted this way, or `none` for not-yet-voted.",
    ),
]


class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"


class PageLimit(int, Enum):
    """Allowed page sizes — the front offers exactly these."""

    L10 = 10
    L25 = 25
    L50 = 50
    L100 = 100
