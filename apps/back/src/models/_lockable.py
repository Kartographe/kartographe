# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Lockable mixin: the columns that let an entity be frozen against edits.

A *locked* entity refuses `PATCH` and `DELETE` (409) while still accepting
comments, votes and child entities — the freeze is on the entity's own data,
not on the activity around it. Locking and unlocking is an owner/administrator
action.

The mixin carries only the three scalar columns. The `locked_by` **relationship**
is declared per model (not here): the lockable entities also carry an `owner`
FK to `user.id`, so a second FK to the same table needs an explicit
`foreign_keys` on each relationship — which only the concrete model can name.
"""

import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class LockableMixin(SQLModel):
    """Freeze columns shared by every lockable entity.

    Not a table — concrete models add it to their bases alongside `BaseModel`.
    """

    locked: bool = Field(default=False)
    locked_by_id: uuid.UUID | None = Field(default=None, foreign_key="user.id", index=True)
    locked_date: datetime | None = None
