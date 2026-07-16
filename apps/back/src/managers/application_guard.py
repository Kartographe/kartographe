# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Guard lifecycle: listing, creation, status flips and delete.

Deleting a guard also removes its id from every route's `application_guard_ids`
array so no route keeps a dangling reference.
"""

import uuid

from sqlalchemy import func, update
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.managers.tagging import tag_overlap
from src.models.application import Application
from src.models.application_guard import ApplicationGuard
from src.models.application_route import ApplicationRoute
from src.models.enum import ApplicationGuardFieldFormat, ApplicationGuardFieldType, ApplicationGuardStatus, ApplicationGuardType
from src.models.user import User
from src.utils.datetime import utc_now


class ApplicationGuardManager(BaseEntityManager):
    def list_for_application(
        self, application: Application, *, tag_ids: list[uuid.UUID] | None = None
    ) -> list[ApplicationGuard]:
        """Every enabled guard of the application, most recent first.

        `tag_ids` keeps only the rows carrying at least one of those tags.
        """
        conditions = [ApplicationGuard.application_id == application.id, ApplicationGuard.enabled.is_(True)]
        if tag_ids:
            conditions.append(tag_overlap(ApplicationGuard, tag_ids))
        return list(
            self.session.exec(
                select(ApplicationGuard).where(*conditions).order_by(ApplicationGuard.date.desc())
            ).all()
        )

    def create(
        self,
        application: Application,
        user: User,
        *,
        type: ApplicationGuardType,
        title: str,
        field_type: ApplicationGuardFieldType,
        field_key: str,
        field_format: ApplicationGuardFieldFormat | None,
        tag_ids: list[uuid.UUID],
    ) -> ApplicationGuard:
        """Create a draft guard owned by `user`."""
        now = utc_now()
        guard = ApplicationGuard(
            account_id=application.account_id,
            application_id=application.id,
            owner_id=user.id,
            date=now,
            type=type,
            status=ApplicationGuardStatus.DRAFT,
            status_date=now,
            title=title,
            field_type=field_type,
            field_key=field_key,
            field_format=field_format,
            tag_ids=tag_ids,
        )
        return self._persist(guard)

    def soft_delete(self, guard: ApplicationGuard) -> None:
        """Soft-delete the guard and detach it from every route that used it."""
        now = utc_now()
        self._disable(guard, now)
        self.session.execute(
            update(ApplicationRoute)
            .where(
                ApplicationRoute.application_id == guard.application_id,
                func.array_position(ApplicationRoute.application_guard_ids, guard.id).isnot(None),
            )
            .values(
                application_guard_ids=func.array_remove(
                    ApplicationRoute.application_guard_ids, guard.id
                ),
                updated_at=now,
            )
        )
        self.session.commit()
