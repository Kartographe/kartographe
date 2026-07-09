"""Resolve the entity a comment points at, batched by entity type.

Comments are polymorphic — they carry an (`entity_type`, `entity_id`) pair
rather than a foreign key, so the target has to be fetched from one of twelve
tables. Resolving per comment would mean a query per row; instead the targets
are grouped by type and each type is loaded in a single `IN (…)` query, then the
containing entities are resolved the same way, level by level.
"""

import uuid
from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from sqlmodel import Session, select

from src.models.application import Application
from src.models.application_route import ApplicationRoute
from src.models.comment import Comment
from src.models.database import Database
from src.models.database_migration import DatabaseMigration
from src.models.database_migration_column import DatabaseMigrationColumn
from src.models.database_table import DatabaseTable
from src.models.database_table_column import DatabaseTableColumn
from src.models.enum import CommentEntityType, DatabaseMigrationColumnType
from src.models.feature import Feature
from src.models.journey import Journey
from src.models.journey_scenario import JourneyScenario
from src.models.journey_scenario_step import JourneyScenarioStep
from src.models.persona import Persona
from src.models.service import Service
from src.models.service_action import ServiceAction
from src.serializes.comments import CommentEntityNode, CommentEntityRef

# A resolved target, keyed by the pair that identifies it.
_Key = tuple[CommentEntityType, uuid.UUID]


@dataclass(frozen=True)
class _EntitySpec:
    """How to load one entity type, label it, and reach its containing entity."""

    model: type
    label: Callable[[Any, dict], str]
    parent_type: CommentEntityType | None = None
    parent_attr: str | None = None


def _title(row: Any, _: dict) -> str:
    return row.title


def _name(row: Any, _: dict) -> str:
    return row.name


def _route_label(row: ApplicationRoute, _: dict) -> str:
    """Routes carry an optional title; fall back to `METHOD /path`."""
    return row.title or f"{row.method.value} {row.path}"


def _migration_column_label(row: DatabaseMigrationColumn, ctx: dict) -> str:
    """A migration step has no name of its own — describe it by what it does.

    A `deletion` only leaves the source side, a `creation` only lands on the
    destination, and a `migration` carries data across; label each by the column
    it acts on, e.g. `creation → email`.
    """
    if row.type == DatabaseMigrationColumnType.DELETION:
        column_id = row.source_database_table_column_id
    else:
        column_id = row.destination_database_table_column_id or row.source_database_table_column_id
    column_name = ctx["column_names"].get(column_id)
    return f"{row.type.value} → {column_name}" if column_name else row.type.value


_SPECS: dict[CommentEntityType, _EntitySpec] = {
    CommentEntityType.FEATURE: _EntitySpec(Feature, _title),
    CommentEntityType.APPLICATION: _EntitySpec(Application, _title),
    CommentEntityType.APPLICATION_ROUTE: _EntitySpec(
        ApplicationRoute, _route_label, CommentEntityType.APPLICATION, "application_id"
    ),
    CommentEntityType.JOURNEY: _EntitySpec(Journey, _title),
    CommentEntityType.JOURNEY_SCENARIO: _EntitySpec(
        JourneyScenario, _title, CommentEntityType.JOURNEY, "journey_id"
    ),
    CommentEntityType.JOURNEY_SCENARIO_STEP: _EntitySpec(
        JourneyScenarioStep, _title, CommentEntityType.JOURNEY_SCENARIO, "journey_scenario_id"
    ),
    CommentEntityType.PERSONA: _EntitySpec(Persona, _title),
    CommentEntityType.DATABASE: _EntitySpec(Database, _title),
    CommentEntityType.DATABASE_TABLE: _EntitySpec(
        DatabaseTable, _name, CommentEntityType.DATABASE, "database_id"
    ),
    CommentEntityType.DATABASE_TABLE_COLUMN: _EntitySpec(
        DatabaseTableColumn, _name, CommentEntityType.DATABASE_TABLE, "database_table_id"
    ),
    # A migration spans two databases (source and destination), so it has no
    # single containing entity to point at.
    CommentEntityType.DATABASE_MIGRATION: _EntitySpec(DatabaseMigration, _title),
    CommentEntityType.DATABASE_MIGRATION_COLUMN: _EntitySpec(
        DatabaseMigrationColumn,
        _migration_column_label,
        CommentEntityType.DATABASE_MIGRATION,
        "database_migration_id",
    ),
    CommentEntityType.SERVICE: _EntitySpec(Service, _title),
    CommentEntityType.SERVICE_ACTION: _EntitySpec(
        ServiceAction, _title, CommentEntityType.SERVICE, "service_id"
    ),
}

# A missing spec would only surface as a KeyError once someone comments on that
# kind of entity — fail at import instead.
assert set(_SPECS) == set(CommentEntityType), "every CommentEntityType needs an entity spec"


def _load_column_names(
    session: Session, account_id: uuid.UUID, rows: dict[_Key, Any]
) -> dict[uuid.UUID, str]:
    """Names of the columns referenced by the migration steps, in one query."""
    column_ids = {
        column_id
        for (entity_type, _), row in rows.items()
        if entity_type == CommentEntityType.DATABASE_MIGRATION_COLUMN
        for column_id in (
            row.source_database_table_column_id,
            row.destination_database_table_column_id,
        )
        if column_id is not None
    }
    if not column_ids:
        return {}
    found = session.exec(
        select(DatabaseTableColumn).where(
            DatabaseTableColumn.id.in_(column_ids),
            DatabaseTableColumn.account_id == account_id,
            DatabaseTableColumn.enabled.is_(True),
        )
    ).all()
    return {row.id: row.name for row in found}


def resolve_entity_refs(
    session: Session, account_id: uuid.UUID, comments: list[Comment]
) -> dict[_Key, CommentEntityRef]:
    """Map each comment's (`entity_type`, `entity_id`) to a display-ready ref.

    Targets that are soft-deleted (or belong to another account) are simply
    absent from the result — the caller renders them as a null `entity`.
    """
    pending: dict[CommentEntityType, set[uuid.UUID]] = defaultdict(set)
    for comment in comments:
        pending[comment.entity_type].add(comment.entity_id)

    # Walk down one level at a time: load this level's rows, queue their parents.
    rows: dict[_Key, Any] = {}
    while pending:
        next_pending: dict[CommentEntityType, set[uuid.UUID]] = defaultdict(set)
        for entity_type, entity_ids in pending.items():
            spec = _SPECS[entity_type]
            found = session.exec(
                select(spec.model).where(
                    spec.model.id.in_(entity_ids),
                    spec.model.account_id == account_id,
                    spec.model.enabled.is_(True),
                )
            ).all()
            for row in found:
                rows[(entity_type, row.id)] = row
                if spec.parent_type is None:
                    continue
                parent_id = getattr(row, spec.parent_attr)
                if parent_id is not None and (spec.parent_type, parent_id) not in rows:
                    next_pending[spec.parent_type].add(parent_id)
        pending = next_pending

    ctx = {"column_names": _load_column_names(session, account_id, rows)}

    def node(key: _Key) -> CommentEntityNode:
        entity_type, _ = key
        row = rows[key]
        return CommentEntityNode(
            id=row.id, type=entity_type, label=_SPECS[entity_type].label(row, ctx)
        )

    def ancestors(key: _Key) -> list[CommentEntityNode]:
        """The containing entities, outermost first. Stops at a missing parent."""
        chain: list[CommentEntityNode] = []
        current = key
        while (spec := _SPECS[current[0]]).parent_type is not None:
            parent_id = getattr(rows[current], spec.parent_attr)
            parent_key = (spec.parent_type, parent_id)
            if parent_id is None or parent_key not in rows:
                break
            chain.append(node(parent_key))
            current = parent_key
        chain.reverse()
        return chain

    return {
        key: CommentEntityRef(**node(key).model_dump(), parents=ancestors(key))
        for key in rows
    }
