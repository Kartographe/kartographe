# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Deployment lifecycle: deploy a version onto an environment, then drive its
state (standby → finished / error / cancelled)."""

import uuid

from fastapi import HTTPException, status
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.application import Application
from src.models.application_environment import ApplicationEnvironment
from src.models.application_environment_version import ApplicationEnvironmentVersion
from src.models.application_version import ApplicationVersion
from src.models.enum import ApplicationEnvironmentVersionStatus
from src.models.user import User
from src.utils.datetime import utc_now


class ApplicationEnvironmentVersionManager(BaseEntityManager):
    def list_for_environment(
        self, environment: ApplicationEnvironment
    ) -> list[ApplicationEnvironmentVersion]:
        """Every enabled deployment record of the environment, most recent first."""
        return list(
            self.session.exec(
                select(ApplicationEnvironmentVersion)
                .where(
                    ApplicationEnvironmentVersion.application_environment_id == environment.id,
                    ApplicationEnvironmentVersion.enabled.is_(True),
                )
                .order_by(ApplicationEnvironmentVersion.date.desc())
            ).all()
        )

    def resolve_application_version(
        self, application: Application, application_version_id: uuid.UUID
    ) -> ApplicationVersion:
        """Load the version to deploy, ensuring it belongs to the application."""
        application_version = self.session.get(ApplicationVersion, application_version_id)
        if (
            application_version is None
            or not application_version.enabled
            or application_version.application_id != application.id
        ):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found on this application.")
        return application_version

    def create(
        self,
        environment: ApplicationEnvironment,
        application_version: ApplicationVersion,
        user: User,
    ) -> ApplicationEnvironmentVersion:
        """Record a standby deployment of `application_version` onto `environment`."""
        now = utc_now()
        deployment = ApplicationEnvironmentVersion(
            account_id=environment.account_id,
            application_id=environment.application_id,
            application_environment_id=environment.id,
            application_version_id=application_version.id,
            owner_id=user.id,
            date=now,
            status=ApplicationEnvironmentVersionStatus.STANDBY,
            status_date=now,
        )
        return self._persist(deployment)

    def soft_delete(self, deployment: ApplicationEnvironmentVersion) -> None:
        """Soft-delete a single deployment record."""
        now = utc_now()
        self._disable(deployment, now)
        self.session.commit()
