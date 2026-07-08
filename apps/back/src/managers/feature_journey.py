"""Feature ↔ journey links: attach an account journey to a feature."""

import uuid

from fastapi import HTTPException, status
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.account import Account
from src.models.feature import Feature
from src.models.feature_journey import FeatureJourney
from src.models.journey import Journey
from src.models.user import User
from src.utils.datetime import utc_now


class FeatureJourneyManager(BaseEntityManager):
    def list_for_feature(self, feature: Feature) -> list[FeatureJourney]:
        """Every enabled journey link of the feature, most recent first."""
        return list(
            self.session.exec(
                select(FeatureJourney)
                .where(
                    FeatureJourney.feature_id == feature.id,
                    FeatureJourney.enabled.is_(True),
                )
                .order_by(FeatureJourney.date.desc())
            ).all()
        )

    def resolve_account_journey(self, account: Account, journey_id: uuid.UUID) -> Journey:
        """Load the journey to attach, ensuring it belongs to the account."""
        journey = self.session.get(Journey, journey_id)
        if journey is None or not journey.enabled or journey.account_id != account.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Journey not found in this account.")
        return journey

    def create(self, feature: Feature, journey: Journey, user: User) -> FeatureJourney:
        """Link `journey` to `feature`."""
        link = FeatureJourney(
            account_id=feature.account_id,
            feature_id=feature.id,
            journey_id=journey.id,
            owner_id=user.id,
            date=utc_now(),
        )
        return self._persist(link)

    def soft_delete(self, link: FeatureJourney) -> None:
        now = utc_now()
        self._disable(link, now)
        self.session.commit()
