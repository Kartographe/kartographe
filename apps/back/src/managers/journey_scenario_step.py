# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Step lifecycle: tree management, action/parameter validation, cascade delete.

Steps form a tree inside a scenario. A step may reference a global
`ActionType`, in which case its `parameters` are validated against that action's
`parameter_schema`; with no action, `parameters` must be empty. Deleting a step
soft-deletes its whole subtree (descendant steps) plus their files and
assertions.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import update
from sqlmodel import select

from src.managers._base import BaseEntityManager, validate_parameters
from src.managers.entity_counts import my_vote_filter
from src.managers.tagging import tag_overlap
from src.models.action_type import ActionType
from src.models.enum import EntityType
from src.models.journey_scenario import JourneyScenario
from src.models.journey_scenario_step import JourneyScenarioStep
from src.models.journey_scenario_step_assertion import JourneyScenarioStepAssertion
from src.models.journey_scenario_step_file import JourneyScenarioStepFile
from src.models.journey_scenario_step_route import JourneyScenarioStepRoute
from src.utils.datetime import utc_now


class JourneyScenarioStepManager(BaseEntityManager):
    def list_for_scenario(
        self,
        scenario: JourneyScenario,
        *,
        tag_ids: list[uuid.UUID] | None = None,
        my_vote: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> list[JourneyScenarioStep]:
        """Every enabled step of the scenario, in insertion order.

        `tag_ids` keeps only the rows carrying at least one of those tags.
        """
        conditions = [JourneyScenarioStep.journey_scenario_id == scenario.id, JourneyScenarioStep.enabled.is_(True)]
        if tag_ids:
            conditions.append(tag_overlap(JourneyScenarioStep, tag_ids))
        if my_vote and user_id:
            conditions.append(my_vote_filter(JourneyScenarioStep, EntityType.JOURNEY_SCENARIO_STEP, user_id, my_vote))
        return list(
            self.session.exec(
                select(JourneyScenarioStep).where(*conditions).order_by(JourneyScenarioStep.created_at.asc())
            ).all()
        )

    # --- validation ------------------------------------------------------

    def _action_schema(self, action_type_id: uuid.UUID | None) -> dict | None:
        if action_type_id is None:
            return None
        action_type = self.session.get(ActionType, action_type_id)
        if action_type is None or not action_type.enabled:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Action type not found.")
        return action_type.parameter_schema

    def _assert_parent_in_scenario(
        self, scenario: JourneyScenario, parent_id: uuid.UUID, *, self_id: uuid.UUID | None = None
    ) -> None:
        if self_id is not None and parent_id == self_id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "A step cannot be its own parent.")
        parent = self.session.get(JourneyScenarioStep, parent_id)
        if parent is None or not parent.enabled or parent.journey_scenario_id != scenario.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Parent step not found in this scenario.")

    # --- mutations -------------------------------------------------------

    def create(
        self,
        scenario: JourneyScenario,
        *,
        parent_journey_scenario_step_id: uuid.UUID | None,
        title: str,
        description: dict | None,
        action_type_id: uuid.UUID | None,
        optional: bool,
        parameters: dict,
        tag_ids: list[uuid.UUID],
    ) -> JourneyScenarioStep:
        """Create a step, validating its parent, action type and parameters.

        The step is **inserted**, not appended: whatever already hung under the
        same parent is re-parented onto the new step. Picking "Étape précédente
        = X" therefore slots the step right after X and before what used to
        follow X; picking none slots it at the head of the scenario.
        """
        if parent_journey_scenario_step_id is not None:
            self._assert_parent_in_scenario(scenario, parent_journey_scenario_step_id)
        validate_parameters(self._action_schema(action_type_id), parameters)
        step = JourneyScenarioStep(
            account_id=scenario.account_id,
            journey_id=scenario.journey_id,
            journey_scenario_id=scenario.id,
            parent_journey_scenario_step_id=parent_journey_scenario_step_id,
            action_type_id=action_type_id,
            title=title,
            description=description,
            optional=optional,
            parameters=parameters,
            tag_ids=tag_ids,
        )
        self.session.add(step)
        self._adopt_former_children(scenario, parent_journey_scenario_step_id, step)
        self.session.commit()
        self.session.refresh(step)
        return step

    def _adopt_former_children(
        self,
        scenario: JourneyScenario,
        parent_id: uuid.UUID | None,
        step: JourneyScenarioStep,
    ) -> None:
        """Re-parent the parent's current children onto the freshly inserted `step`.

        Runs in the same transaction as the insert. The new step is excluded by
        id — the pending INSERT is autoflushed before this UPDATE, so it would
        otherwise match its own parent filter and become its own parent.
        """
        parent_matches = (
            JourneyScenarioStep.parent_journey_scenario_step_id.is_(None)
            if parent_id is None
            else JourneyScenarioStep.parent_journey_scenario_step_id == parent_id
        )
        self.session.execute(
            update(JourneyScenarioStep)
            .where(
                JourneyScenarioStep.journey_scenario_id == scenario.id,
                JourneyScenarioStep.id != step.id,
                JourneyScenarioStep.enabled.is_(True),
                parent_matches,
            )
            .values(parent_journey_scenario_step_id=step.id, updated_at=utc_now())
        )

    def update(
        self, scenario: JourneyScenario, step: JourneyScenarioStep, fields: dict
    ) -> JourneyScenarioStep:
        """Apply a partial update, re-validating parent, action and parameters."""
        parent_id = fields.get("parent_journey_scenario_step_id")
        if "parent_journey_scenario_step_id" in fields and parent_id is not None:
            self._assert_parent_in_scenario(scenario, parent_id, self_id=step.id)

        action_type_id = fields["action_type_id"] if "action_type_id" in fields else step.action_type_id
        parameters = fields["parameters"] if "parameters" in fields else step.parameters
        if "action_type_id" in fields or "parameters" in fields:
            validate_parameters(self._action_schema(action_type_id), parameters)
        return self.apply_update(step, fields)

    def _descendant_step_ids(self, step_id: uuid.UUID) -> list[uuid.UUID]:
        """The step id plus every enabled descendant step id (BFS)."""
        ids = [step_id]
        frontier = [step_id]
        while frontier:
            children = self.session.exec(
                select(JourneyScenarioStep.id).where(
                    JourneyScenarioStep.parent_journey_scenario_step_id.in_(frontier),
                    JourneyScenarioStep.enabled.is_(True),
                )
            ).all()
            fresh = [c for c in children if c not in ids]
            ids.extend(fresh)
            frontier = fresh
        return ids

    def soft_delete(self, step: JourneyScenarioStep) -> None:
        """Soft-delete the step's subtree and every file/assertion beneath it."""
        self._guard_unlocked(step)
        now = utc_now()
        ids = self._descendant_step_ids(step.id)
        self._bulk_disable(JourneyScenarioStep, JourneyScenarioStep.id.in_(ids), now=now)
        self._bulk_disable(
            JourneyScenarioStepFile,
            JourneyScenarioStepFile.journey_scenario_step_id.in_(ids),
            now=now,
        )
        self._bulk_disable(
            JourneyScenarioStepAssertion,
            JourneyScenarioStepAssertion.journey_scenario_step_id.in_(ids),
            now=now,
        )
        self._bulk_disable(
            JourneyScenarioStepRoute,
            JourneyScenarioStepRoute.journey_scenario_step_id.in_(ids),
            now=now,
        )
        self.session.commit()
