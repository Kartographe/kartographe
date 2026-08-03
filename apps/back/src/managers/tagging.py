# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Shared tagging primitives: the entity registry and the `tag_ids` overlap filter.

Tagged entities carry their tags as a `tag_ids` UUID array rather than a join
table, so "has at least one of these tags" is a Postgres array overlap — see
`src/managers/_arrays.py`, which `personas_ids` filtering uses too.
"""

import uuid

from sqlalchemy.sql.elements import ColumnElement

from src.managers._arrays import uuid_array_overlap
from src.models.application import Application
from src.models.application_component import ApplicationComponent
from src.models.application_guard import ApplicationGuard
from src.models.application_route import ApplicationRoute
from src.models.database import Database
from src.models.database_table import DatabaseTable
from src.models.database_table_column import DatabaseTableColumn
from src.models.enum import TagEntityType
from src.models.feature import Feature
from src.models.journey import Journey
from src.models.journey_scenario import JourneyScenario
from src.models.journey_scenario_step import JourneyScenarioStep
from src.models.persona import Persona

# The entity table (and its `tag_ids` column) each tag type targets. Every
# member of `TagEntityType` must appear here — a missing entry means a tag of
# that type can be created but never detached on delete.
TAGGED_MODEL: dict[TagEntityType, type] = {
    TagEntityType.APPLICATION: Application,
    TagEntityType.APPLICATION_ROUTE: ApplicationRoute,
    TagEntityType.APPLICATION_GUARD: ApplicationGuard,
    TagEntityType.APPLICATION_COMPONENT: ApplicationComponent,
    TagEntityType.FEATURE: Feature,
    TagEntityType.JOURNEY: Journey,
    TagEntityType.JOURNEY_SCENARIO: JourneyScenario,
    TagEntityType.JOURNEY_SCENARIO_STEP: JourneyScenarioStep,
    TagEntityType.PERSONA: Persona,
    TagEntityType.DATABASE: Database,
    TagEntityType.DATABASE_TABLE: DatabaseTable,
    TagEntityType.DATABASE_TABLE_COLUMN: DatabaseTableColumn,
}

assert set(TAGGED_MODEL) == set(TagEntityType), "every TagEntityType needs a tagged model"


def tag_overlap(model: type, tag_ids: list[uuid.UUID]) -> ColumnElement[bool]:
    """Condition matching rows carrying **at least one** of `tag_ids`."""
    return uuid_array_overlap(model.tag_ids, tag_ids)
