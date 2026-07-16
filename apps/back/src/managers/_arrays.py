# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Postgres UUID-array overlap — the primitive behind the `*_ids` list filters.

Several entities carry their links as a UUID array column rather than a join
table: `tag_ids` on everything taggable, `personas_ids` on journeys and
scenarios. "Has at least one of these" is therefore the Postgres array-overlap
operator `&&`, which is one condition and can use a GIN index, instead of a
join plus a DISTINCT.

The cast is not decoration: `array([...])` builds an untyped array literal, and
Postgres cannot compare `uuid[]` to it without being told what it holds.
"""

import uuid

from sqlalchemy import Uuid, cast
from sqlalchemy.dialects.postgresql import ARRAY as PgArray
from sqlalchemy.dialects.postgresql import array
from sqlalchemy.sql.elements import ColumnElement


def uuid_array_overlap(column, ids: list[uuid.UUID]) -> ColumnElement[bool]:
    """Condition matching rows whose `column` holds **at least one** of `ids`.

    Callers must guard against an empty `ids`: an empty overlap matches nothing,
    which reads as "filter on nothing" and would silently empty the listing.
    """
    return column.op("&&")(cast(array(ids), PgArray(Uuid)))
