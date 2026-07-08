"""Application ↔ feature links: attach an account feature to an application and
track the version window during which it is present."""

import uuid

from fastapi import HTTPException, status
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.account import Account
from src.models.application import Application
from src.models.application_feature import ApplicationFeature
from src.models.application_version import ApplicationVersion
from src.models.feature import Feature
from src.models.user import User
from src.utils.datetime import utc_now

# Patch keys carrying a version reference that must belong to the application.
_VERSION_KEYS = ("start_application_version_id", "end_application_version_id")


class ApplicationFeatureManager(BaseEntityManager):
    def list_for_application(self, application: Application) -> list[ApplicationFeature]:
        """Every enabled feature link of the application, most recent first."""
        return list(
            self.session.exec(
                select(ApplicationFeature)
                .where(
                    ApplicationFeature.application_id == application.id,
                    ApplicationFeature.enabled.is_(True),
                )
                .order_by(ApplicationFeature.date.desc())
            ).all()
        )

    def resolve_account_feature(self, account: Account, feature_id: uuid.UUID) -> Feature:
        """Load the feature to attach, ensuring it belongs to the account."""
        feature = self.session.get(Feature, feature_id)
        if feature is None or not feature.enabled or feature.account_id != account.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Feature not found in this account.")
        return feature

    def _assert_version_on_application(
        self, application: Application, application_version_id: uuid.UUID
    ) -> None:
        application_version = self.session.get(ApplicationVersion, application_version_id)
        if (
            application_version is None
            or not application_version.enabled
            or application_version.application_id != application.id
        ):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found on this application.")

    def create(
        self, application: Application, feature: Feature, user: User
    ) -> ApplicationFeature:
        """Link `feature` to `application` (presence window left open)."""
        now = utc_now()
        application_feature = ApplicationFeature(
            account_id=application.account_id,
            application_id=application.id,
            feature_id=feature.id,
            owner_id=user.id,
            date=now,
        )
        return self._persist(application_feature)

    def update(
        self, application: Application, application_feature: ApplicationFeature, fields: dict
    ) -> ApplicationFeature:
        """Update the presence window, validating any version references."""
        for key in _VERSION_KEYS:
            version_id = fields.get(key)
            if version_id is not None:
                self._assert_version_on_application(application, version_id)
        return self.apply_update(application_feature, fields)

    def soft_delete(self, application_feature: ApplicationFeature) -> None:
        """Soft-delete a single feature link."""
        now = utc_now()
        self._disable(application_feature, now)
        self.session.commit()
