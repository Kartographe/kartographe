"""Version lifecycle: listing, creation, status flips and cascading delete."""

from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.application import Application
from src.models.application_environment_version import ApplicationEnvironmentVersion
from src.models.application_version import ApplicationVersion
from src.models.enum import ApplicationStatus, ApplicationVersionType
from src.models.user import User
from src.utils.datetime import utc_now


class ApplicationVersionManager(BaseEntityManager):
    def list_for_application(self, application: Application) -> list[ApplicationVersion]:
        """Every enabled version of the application, most recent first."""
        return list(
            self.session.exec(
                select(ApplicationVersion)
                .where(
                    ApplicationVersion.application_id == application.id,
                    ApplicationVersion.enabled.is_(True),
                )
                .order_by(ApplicationVersion.date.desc())
            ).all()
        )

    def create(
        self,
        application: Application,
        user: User,
        *,
        type: ApplicationVersionType,
        title: str,
        version: list[int],
        description: dict | None,
    ) -> ApplicationVersion:
        """Create a draft version owned by `user`."""
        now = utc_now()
        application_version = ApplicationVersion(
            account_id=application.account_id,
            application_id=application.id,
            owner_id=user.id,
            date=now,
            type=type,
            status=ApplicationStatus.DRAFT,
            status_date=now,
            title=title,
            version=version,
            description=description,
        )
        return self._persist(application_version)

    def soft_delete(self, application_version: ApplicationVersion) -> None:
        """Soft-delete the version and the deployment records that reference it."""
        now = utc_now()
        self._disable(application_version, now)
        self._bulk_disable(
            ApplicationEnvironmentVersion,
            ApplicationEnvironmentVersion.application_version_id == application_version.id,
            now=now,
        )
        self.session.commit()
