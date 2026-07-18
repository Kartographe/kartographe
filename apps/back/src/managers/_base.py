# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Shared helpers for the entity managers.

The application/feature domains all expose the same lifecycle verbs (partial
update, status flip with a stamped `status_date`, soft-delete with cascades).
`BaseEntityManager` factors those out so each concrete manager only carries its
listing query, its creation shape and its specific cascade set.
"""

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import update
from sqlmodel import Session

from src.utils.datetime import utc_now


def validate_parameters(schema: dict | None, parameters: dict) -> None:
    """Check `parameters` against an action/assertion `parameter_schema`.

    The schema is a flat shape hint (`{"selector": "string", "value": "string"}`),
    not a JSON-Schema document, so validation is deliberately light: the object's
    keys must match the schema's keys exactly — no unknown and no missing keys.
    An empty schema (`{}`) therefore requires empty parameters.
    """
    if not isinstance(parameters, dict):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Parameters must be an object.")
    allowed = set(schema or {})
    provided = set(parameters)
    unknown = provided - allowed
    if unknown:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"Unknown parameter(s): {', '.join(sorted(unknown))}.",
        )
    missing = allowed - provided
    if missing:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"Missing parameter(s): {', '.join(sorted(missing))}.",
        )


class BaseEntityManager:
    def __init__(self, session: Session):
        self.session = session

    # --- serialization enrichment ---------------------------------------

    def enrich(self, entity_type, items: list, *, user_id=None) -> list:
        """Fill the items' polymorphic aggregate counts (comments, votes, tags).

        Call after serializing a listing (e.g. on the result of `tags.attach`):
        one grouped query per aggregate for the whole page, written onto each
        item in place. Pass `user_id` (the signed-in member) on listings to also
        fill each item's `my_vote`. See `src/managers/entity_counts.py`.
        """
        from src.managers.entity_counts import enrich_items

        return enrich_items(self.session, entity_type, items, user_id=user_id)

    def enrich_one(self, entity_type, item, *, user_id=None):
        """Fill a single serialized item's aggregate counts."""
        self.enrich(entity_type, [item], user_id=user_id)
        return item

    # --- persistence -----------------------------------------------------

    def _persist(self, obj):
        self.session.add(obj)
        self.session.commit()
        self.session.refresh(obj)
        return obj

    # --- lock ------------------------------------------------------------

    @staticmethod
    def _guard_unlocked(obj) -> None:
        """Refuse an edit or delete on a locked entity.

        Lockable entities carry a `locked` flag; entities that never lock don't,
        so a plain `getattr` keeps this a no-op for them. Locking, commenting,
        voting and child entities stay allowed — only the entity's own `PATCH`
        and `DELETE` are frozen.
        """
        if getattr(obj, "locked", False):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "This entity is locked. Unlock it before editing or deleting it.",
            )

    def lock(self, obj, user):
        """Freeze the entity against edits/deletes, stamping who and when."""
        now = utc_now()
        obj.locked = True
        obj.locked_by_id = user.id
        obj.locked_date = now
        obj.updated_at = now
        return self._persist(obj)

    def unlock(self, obj):
        """Lift the freeze, clearing who/when."""
        now = utc_now()
        obj.locked = False
        obj.locked_by_id = None
        obj.locked_date = None
        obj.updated_at = now
        return self._persist(obj)

    def apply_update(self, obj, fields: dict):
        """Apply a partial update (already-validated, snake_case keys).

        A `status` in `fields` stamps `status_date`, so a status reached through
        PATCH is dated exactly as one reached through `set_status` used to be.
        Without this the field would silently keep the date of a status the row
        no longer holds — which is worse than having no date at all.

        Guarded on the field existing: `Persona` has a `status` and no
        `status_date`, and `DatabaseVersion` dates its lifecycle with
        `start_date`/`end_date` instead. Assigning to a field a table model does
        not declare is not an error in SQLModel — it silently sets a plain Python
        attribute that is never persisted.
        """
        self._guard_unlocked(obj)
        if (
            "status" in fields
            and fields["status"] != obj.status
            and "status_date" in type(obj).model_fields
        ):
            obj.status_date = utc_now()
        for key, value in fields.items():
            setattr(obj, key, value)
        obj.updated_at = utc_now()
        return self._persist(obj)

    def set_status(self, obj, new_status, *, status_details: str | None = None):
        """Flip `status` (and stamp `status_date`), optionally with details."""
        self._guard_unlocked(obj)
        touched = False
        if obj.status != new_status:
            obj.status = new_status
            obj.status_date = utc_now()
            touched = True
        if status_details is not None:
            obj.status_details = status_details
            touched = True
        if not touched:
            return obj
        obj.updated_at = utc_now()
        return self._persist(obj)

    # --- soft delete -----------------------------------------------------

    def _disable(self, obj, now: datetime) -> None:
        obj.enabled = False
        obj.deleted_at = now
        obj.updated_at = now
        self.session.add(obj)

    def _bulk_disable(self, model, *conditions, now: datetime) -> None:
        """Soft-delete every enabled row of `model` matching `conditions`."""
        self.session.execute(
            update(model)
            .where(*conditions, model.enabled.is_(True))
            .values(enabled=False, deleted_at=now, updated_at=now)
        )
