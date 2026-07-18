# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Unit tests for the lock guard.

The guard is the single enforcement point behind every locked entity's frozen
`PATCH`/`DELETE`, so it is worth pinning independently of the database: a locked
entity is refused with 409, an unlocked one passes, and an entity type that
never locks (no `locked` attribute) is unaffected.
"""

import pytest
from fastapi import HTTPException, status

from src.managers._base import BaseEntityManager


class _Lockable:
    def __init__(self, locked: bool):
        self.locked = locked


def test_guard_blocks_locked_entity():
    with pytest.raises(HTTPException) as exc:
        BaseEntityManager._guard_unlocked(_Lockable(locked=True))
    assert exc.value.status_code == status.HTTP_409_CONFLICT


def test_guard_allows_unlocked_entity():
    # Does not raise.
    BaseEntityManager._guard_unlocked(_Lockable(locked=False))


def test_guard_noop_for_non_lockable_entity():
    # An entity type without a `locked` attribute is never frozen.
    BaseEntityManager._guard_unlocked(object())
