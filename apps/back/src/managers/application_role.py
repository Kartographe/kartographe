"""Role lifecycle: listing, creation, status flips and delete.

Deleting a role also removes its id from every route's `application_role_ids`
array so no route keeps a dangling reference.
"""

from sqlalchemy import func, update
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.application import Application
from src.models.application_role import ApplicationRole
from src.models.application_route import ApplicationRoute
from src.models.enum import ApplicationRoleStatus
from src.models.user import User
from src.utils.datetime import utc_now


class ApplicationRoleManager(BaseEntityManager):
    def list_for_application(self, application: Application) -> list[ApplicationRole]:
        """Every enabled role of the application, most recent first."""
        return list(
            self.session.exec(
                select(ApplicationRole)
                .where(
                    ApplicationRole.application_id == application.id,
                    ApplicationRole.enabled.is_(True),
                )
                .order_by(ApplicationRole.date.desc())
            ).all()
        )

    def create(
        self, application: Application, user: User, *, title: str, description: dict | None
    ) -> ApplicationRole:
        """Create a draft role owned by `user`."""
        now = utc_now()
        role = ApplicationRole(
            account_id=application.account_id,
            application_id=application.id,
            owner_id=user.id,
            date=now,
            status=ApplicationRoleStatus.DRAFT,
            status_date=now,
            title=title,
            description=description,
        )
        return self._persist(role)

    def soft_delete(self, role: ApplicationRole) -> None:
        """Soft-delete the role and detach it from every route that used it."""
        now = utc_now()
        self._disable(role, now)
        self.session.execute(
            update(ApplicationRoute)
            .where(
                ApplicationRoute.application_id == role.application_id,
                func.array_position(ApplicationRoute.application_role_ids, role.id).isnot(None),
            )
            .values(
                application_role_ids=func.array_remove(
                    ApplicationRoute.application_role_ids, role.id
                ),
                updated_at=now,
            )
        )
        self.session.commit()
