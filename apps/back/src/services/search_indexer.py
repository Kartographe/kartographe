# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Keep the `search` index in sync with the entities it mirrors.

Every `Searchable` model gets mapper-level SQLAlchemy event listeners so that a
write to the entity upserts (or clears) its `search` row **in the same
transaction** — no extra `Session.add`, no background job. `wire_search_indexers`
auto-discovers every mapped `Searchable` and wires it once, called at the end of
`src/models/__init__.py`.

Soft-delete is the norm here (`enabled=False` + `deleted_at`), not `DELETE`, so
`after_update` is where de-indexing usually happens: a row that is disabled — or
whose text has become empty (e.g. a removed comment) — drops out of the index.
`after_delete` covers the rarer hard delete.

Bulk soft-deletes done via Core `UPDATE` (`BaseEntityManager._bulk_disable`) do
not emit per-row mapper events, so cascade-disabled children can leave a stale
`search` row behind. That is deliberately tolerated: the search route re-resolves
every hit against the live entity and silently drops orphans, so a stale row is
invisible, never wrong.
"""

from sqlalchemy import event, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import SQLModel

from src.models._base import uuid7
from src.models._search import Searchable
from src.models.search import Search

# Models already wired, so a re-import never double-registers a listener.
_wired: set[type] = set()


def _delete_index(connection, model: type, entity_id) -> None:
    connection.execute(
        Search.__table__.delete().where(
            (Search.entity_type == model.SEARCH_ENTITY_TYPE)
            & (Search.entity_id == entity_id)
        )
    )


def _sync_index(connection, target: Searchable) -> None:
    """Upsert the entity's index row, or delete it when it has nothing to index."""
    if not getattr(target, "enabled", True) or not target.has_search_content():
        _delete_index(connection, type(target), target.id)
        return

    statement = (
        pg_insert(Search)
        .values(
            id=uuid7(),
            enabled=True,
            account_id=target.account_id,
            entity_type=target.SEARCH_ENTITY_TYPE,
            entity_id=target.id,
            language=target.SEARCH_LANGUAGE,
            vector=target.build_tsvector(),
        )
        .on_conflict_do_update(
            index_elements=["entity_id"],
            set_={
                "enabled": True,
                "account_id": target.account_id,
                "entity_type": target.SEARCH_ENTITY_TYPE,
                "language": target.SEARCH_LANGUAGE,
                "vector": target.build_tsvector(),
                "updated_at": func.now(),
            },
        )
    )
    connection.execute(statement)


def register_searchable_listeners(model: type) -> None:
    """Attach insert/update/delete index-sync listeners to one `Searchable` model."""
    if model in _wired:
        return
    _wired.add(model)

    @event.listens_for(model, "after_insert")
    @event.listens_for(model, "after_update")
    def _on_write(_mapper, connection, target):
        _sync_index(connection, target)

    @event.listens_for(model, "after_delete")
    def _on_delete(_mapper, connection, target):
        _delete_index(connection, type(target), target.id)


def wire_search_indexers() -> None:
    """Wire every mapped `Searchable` model. Idempotent; call once at import."""
    for mapper in SQLModel._sa_registry.mappers:
        model = mapper.class_
        if isinstance(model, type) and issubclass(model, Searchable):
            register_searchable_listeners(model)
