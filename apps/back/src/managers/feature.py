# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Feature lifecycle: listing, creation, status flips and cascading delete."""

import uuid

from sqlmodel import func, select

from src.filters._base import SortOrder
from src.filters.features import FeatureSortField
from src.managers._base import BaseEntityManager
from src.managers.tagging import tag_overlap
from src.models.account import Account
from src.models.application_feature import ApplicationFeature
from src.models.enum import FeatureStatus, FeatureType
from src.models.feature import Feature
from src.models.feature_file import FeatureFile
from src.models.user import User
from src.utils.datetime import utc_now

_SORT_COLUMNS = {
    FeatureSortField.DATE: Feature.date,
    FeatureSortField.TITLE: Feature.title,
    FeatureSortField.STATUS: Feature.status,
    FeatureSortField.TYPE: Feature.type,
}


class FeatureManager(BaseEntityManager):
    def list_for_account(
        self,
        account: Account,
        *,
        statuses: list[FeatureStatus] | None = None,
        types: list[FeatureType] | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        sort_by: FeatureSortField = FeatureSortField.DATE,
        sort_order: SortOrder = SortOrder.DESC,
        page: int = 1,
        limit: int = 25,
    ) -> tuple[list[Feature], int]:
        """One page of the account's features. Returns `(rows, total)`."""
        conditions = [Feature.account_id == account.id, Feature.enabled.is_(True)]
        if statuses:
            conditions.append(Feature.status.in_(statuses))
        if types:
            conditions.append(Feature.type.in_(types))
        if tag_ids:
            conditions.append(tag_overlap(Feature, tag_ids))

        base = select(Feature).where(*conditions)
        total = self.session.exec(select(func.count()).select_from(base.subquery())).one()

        column = _SORT_COLUMNS[sort_by]
        ordering = column.asc() if sort_order == SortOrder.ASC else column.desc()
        rows = self.session.exec(
            base.order_by(ordering).offset((page - 1) * limit).limit(limit)
        ).all()
        return list(rows), total

    def create(
        self,
        account: Account,
        user: User,
        *,
        title: str,
        description: dict | None,
        type: FeatureType,
        tag_ids: list[uuid.UUID],
    ) -> Feature:
        """Create a draft feature owned by `user`."""
        now = utc_now()
        feature = Feature(
            account_id=account.id,
            owner_id=user.id,
            date=now,
            title=title,
            description=description,
            type=type,
            status=FeatureStatus.DRAFT,
            status_date=now,
            tag_ids=tag_ids,
        )
        return self._persist(feature)

    def soft_delete(self, feature: Feature) -> None:
        """Soft-delete the feature, its files and its application links."""
        now = utc_now()
        self._disable(feature, now)
        self._bulk_disable(ApplicationFeature, ApplicationFeature.feature_id == feature.id, now=now)
        self._bulk_disable(FeatureFile, FeatureFile.feature_id == feature.id, now=now)
        self.session.commit()
