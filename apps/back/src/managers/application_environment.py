"""Environment lifecycle: listing, creation, status flips and cascading delete."""

from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.application import Application
from src.models.application_environment import ApplicationEnvironment
from src.models.application_environment_version import ApplicationEnvironmentVersion
from src.models.enum import ApplicationEnvironmentType, ApplicationStatus
from src.models.user import User
from src.utils.datetime import utc_now


class ApplicationEnvironmentManager(BaseEntityManager):
    def list_for_application(self, application: Application) -> list[ApplicationEnvironment]:
        """Every enabled environment of the application, most recent first."""
        return list(
            self.session.exec(
                select(ApplicationEnvironment)
                .where(
                    ApplicationEnvironment.application_id == application.id,
                    ApplicationEnvironment.enabled.is_(True),
                )
                .order_by(ApplicationEnvironment.date.desc())
            ).all()
        )

    def create(
        self,
        application: Application,
        user: User,
        *,
        type: ApplicationEnvironmentType,
        title: str,
        description: dict,
        url: str | None,
    ) -> ApplicationEnvironment:
        """Create a draft environment owned by `user`."""
        now = utc_now()
        environment = ApplicationEnvironment(
            account_id=application.account_id,
            application_id=application.id,
            owner_id=user.id,
            date=now,
            type=type,
            status=ApplicationStatus.DRAFT,
            status_date=now,
            title=title,
            description=description,
            url=url,
        )
        return self._persist(environment)

    def soft_delete(self, environment: ApplicationEnvironment) -> None:
        """Soft-delete the environment and its deployment records."""
        now = utc_now()
        self._disable(environment, now)
        self._bulk_disable(
            ApplicationEnvironmentVersion,
            ApplicationEnvironmentVersion.application_environment_id == environment.id,
            now=now,
        )
        self.session.commit()
