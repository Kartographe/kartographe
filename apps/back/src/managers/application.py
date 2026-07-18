# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Application lifecycle: listing, creation, status flips and cascading delete."""

import uuid

from sqlmodel import func, select

from src.filters._base import SortOrder
from src.filters.applications import ApplicationSortField
from src.managers._base import BaseEntityManager
from src.managers.entity_counts import my_vote_filter
from src.managers.tagging import tag_overlap
from src.models.account import Account
from src.models.application import Application
from src.models.application_environment import ApplicationEnvironment
from src.models.application_environment_version import ApplicationEnvironmentVersion
from src.models.application_feature import ApplicationFeature
from src.models.application_version import ApplicationVersion
from src.models.enum import ApplicationStatus, ApplicationType, EntityType
from src.models.user import User
from src.utils.datetime import utc_now

_SORT_COLUMNS = {
    ApplicationSortField.DATE: Application.date,
    ApplicationSortField.TITLE: Application.title,
    ApplicationSortField.STATUS: Application.status,
    ApplicationSortField.TYPE: Application.type,
}


class ApplicationManager(BaseEntityManager):
    def list_for_account(
        self,
        account: Account,
        *,
        statuses: list[ApplicationStatus] | None = None,
        types: list[ApplicationType] | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        my_vote: str | None = None,
        user_id: uuid.UUID | None = None,
        sort_by: ApplicationSortField = ApplicationSortField.DATE,
        sort_order: SortOrder = SortOrder.DESC,
        page: int = 1,
        limit: int = 25,
    ) -> tuple[list[Application], int]:
        """One page of the account's applications. Returns `(rows, total)`."""
        conditions = [Application.account_id == account.id, Application.enabled.is_(True)]
        if statuses:
            conditions.append(Application.status.in_(statuses))
        if types:
            conditions.append(Application.type.in_(types))
        if tag_ids:
            conditions.append(tag_overlap(Application, tag_ids))
        if my_vote and user_id:
            conditions.append(my_vote_filter(Application, EntityType.APPLICATION, user_id, my_vote))

        base = select(Application).where(*conditions)
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
        description: str | None,
        type: ApplicationType,
        tag_ids: list[uuid.UUID],
    ) -> Application:
        """Create a draft application owned by `user`."""
        now = utc_now()
        application = Application(
            account_id=account.id,
            owner_id=user.id,
            date=now,
            title=title,
            description=description,
            type=type,
            status=ApplicationStatus.DRAFT,
            status_date=now,
            tag_ids=tag_ids,
        )
        return self._persist(application)

    def soft_delete(self, application: Application) -> None:
        """Soft-delete the application and every child entity that hangs off it."""
        self._guard_unlocked(application)
        now = utc_now()
        self._disable(application, now)
        self._bulk_disable(
            ApplicationEnvironment, ApplicationEnvironment.application_id == application.id, now=now
        )
        self._bulk_disable(
            ApplicationVersion, ApplicationVersion.application_id == application.id, now=now
        )
        self._bulk_disable(
            ApplicationEnvironmentVersion,
            ApplicationEnvironmentVersion.application_id == application.id,
            now=now,
        )
        self._bulk_disable(
            ApplicationFeature, ApplicationFeature.application_id == application.id, now=now
        )
        self.session.commit()
