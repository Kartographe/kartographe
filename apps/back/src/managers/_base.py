"""Shared helpers for the entity managers.

The application/feature domains all expose the same lifecycle verbs (partial
update, status flip with a stamped `status_date`, soft-delete with cascades).
`BaseEntityManager` factors those out so each concrete manager only carries its
listing query, its creation shape and its specific cascade set.
"""

from datetime import datetime

from sqlalchemy import update
from sqlmodel import Session

from src.utils.datetime import utc_now


class BaseEntityManager:
    def __init__(self, session: Session):
        self.session = session

    # --- persistence -----------------------------------------------------

    def _persist(self, obj):
        self.session.add(obj)
        self.session.commit()
        self.session.refresh(obj)
        return obj

    def apply_update(self, obj, fields: dict):
        """Apply a partial update (already-validated, snake_case keys)."""
        for key, value in fields.items():
            setattr(obj, key, value)
        obj.updated_at = utc_now()
        return self._persist(obj)

    def set_status(self, obj, new_status, *, status_details: str | None = None):
        """Flip `status` (and stamp `status_date`), optionally with details."""
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
