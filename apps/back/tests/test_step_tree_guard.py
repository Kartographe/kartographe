# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Unit tests for the step re-parenting guard.

Steps form a tree inside a scenario, and nothing downstream survives that tree
being closed into a ring: the rows are still there and still returned, but no
step is a root any more, so a reader walking from the roots finds none of them
and a scenario full of steps reads as empty. Each row on its own stays perfectly
valid, so this guard is the only place it can be caught — worth pinning without
a database.
"""

import uuid

import pytest
from fastapi import HTTPException, status

from src.managers.journey_scenario_step import JourneyScenarioStepManager

SCENARIO_ID = uuid.UUID("019813f7-0000-7000-8000-0000000000ff")


class _Step:
    def __init__(self, step_id: uuid.UUID, parent_id: uuid.UUID | None):
        self.id = step_id
        self.parent_journey_scenario_step_id = parent_id
        self.journey_scenario_id = SCENARIO_ID
        self.enabled = True


class _Scenario:
    id = SCENARIO_ID


class _Session:
    """The two reads the guard makes: fetch one step, list children of many."""

    def __init__(self, steps: list[_Step]):
        self._steps = {step.id: step for step in steps}

    def get(self, _model, step_id):
        return self._steps.get(step_id)

    def exec(self, _statement):
        raise NotImplementedError


def _manager(steps: list[_Step], chain: dict[uuid.UUID, list[uuid.UUID]]):
    """A manager whose descendant walk is served from `chain` (parent → children)."""
    manager = JourneyScenarioStepManager(_Session(steps))
    manager._descendant_step_ids = lambda step_id: _walk(chain, step_id)
    return manager


def _walk(chain: dict[uuid.UUID, list[uuid.UUID]], step_id: uuid.UUID) -> list[uuid.UUID]:
    ids = [step_id]
    frontier = [step_id]
    while frontier:
        fresh = [c for parent in frontier for c in chain.get(parent, []) if c not in ids]
        ids.extend(fresh)
        frontier = fresh
    return ids


def test_a_step_cannot_be_its_own_parent():
    step_id = uuid.uuid4()
    manager = _manager([_Step(step_id, None)], {})
    with pytest.raises(HTTPException) as exc:
        manager._assert_parent_in_scenario(_Scenario(), step_id, self_id=step_id)
    assert exc.value.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_a_step_cannot_move_under_its_own_child():
    parent, child = uuid.uuid4(), uuid.uuid4()
    manager = _manager(
        [_Step(parent, None), _Step(child, parent)], {parent: [child]}
    )
    with pytest.raises(HTTPException) as exc:
        manager._assert_parent_in_scenario(_Scenario(), child, self_id=parent)
    assert exc.value.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_a_step_cannot_move_under_a_deeper_descendant():
    # The ring only closes three levels down — the guard has to walk, not peek.
    top, middle, bottom = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    manager = _manager(
        [_Step(top, None), _Step(middle, top), _Step(bottom, middle)],
        {top: [middle], middle: [bottom]},
    )
    with pytest.raises(HTTPException) as exc:
        manager._assert_parent_in_scenario(_Scenario(), bottom, self_id=top)
    assert exc.value.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_a_step_may_move_under_an_unrelated_step():
    step_id, other = uuid.uuid4(), uuid.uuid4()
    manager = _manager([_Step(step_id, None), _Step(other, None)], {})
    # Does not raise.
    manager._assert_parent_in_scenario(_Scenario(), other, self_id=step_id)


def test_creation_skips_the_descendant_walk():
    # A step being created has no descendants; passing no `self_id` must not
    # send the guard looking for them.
    parent = uuid.uuid4()
    manager = JourneyScenarioStepManager(_Session([_Step(parent, None)]))
    # `_descendant_step_ids` would hit the unimplemented `exec` if it ran.
    manager._assert_parent_in_scenario(_Scenario(), parent)


def test_a_parent_outside_the_scenario_is_not_found():
    manager = _manager([], {})
    with pytest.raises(HTTPException) as exc:
        manager._assert_parent_in_scenario(_Scenario(), uuid.uuid4(), self_id=uuid.uuid4())
    assert exc.value.status_code == status.HTTP_404_NOT_FOUND
