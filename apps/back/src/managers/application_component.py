# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Component lifecycle: creation, listing inside an application or across the
account, and soft-delete.

Updates, status flips and lock/unlock come from `BaseEntityManager`. Deleting a
component takes its database-table links with it; its comments, votes and
estimates keep pointing at a target the resolvers drop silently, as everywhere
else.
"""

import uuid

from sqlmodel import func, select

from src.filters._base import SortOrder
from src.filters.application_components import ApplicationComponentSortField
from src.managers._base import BaseEntityManager
from src.managers.entity_counts import my_vote_filter
from src.managers.tagging import tag_overlap
from src.models.account import Account
from src.models.application import Application
from src.models.application_component import ApplicationComponent
from src.models.application_component_database_table import (
    ApplicationComponentDatabaseTable,
)
from src.models.enum import (
    ApplicationComponentStatus,
    ApplicationComponentType,
    EntityType,
)
from src.models.user import User
from src.utils.datetime import utc_now

_SORT_COLUMNS = {
    ApplicationComponentSortField.DATE: ApplicationComponent.date,
    ApplicationComponentSortField.TITLE: ApplicationComponent.title,
    ApplicationComponentSortField.STATUS: ApplicationComponent.status,
    ApplicationComponentSortField.TYPE: ApplicationComponent.type,
}


class ApplicationComponentManager(BaseEntityManager):
    def list_for_application(
        self,
        application: Application,
        *,
        tag_ids: list[uuid.UUID] | None = None,
        my_vote: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> list[ApplicationComponent]:
        """Every enabled component of the application, most recent first.

        `tag_ids` keeps only the rows carrying at least one of those tags.
        """
        conditions = [
            ApplicationComponent.application_id == application.id,
            ApplicationComponent.enabled.is_(True),
        ]
        if tag_ids:
            conditions.append(tag_overlap(ApplicationComponent, tag_ids))
        if my_vote and user_id:
            conditions.append(
                my_vote_filter(
                    ApplicationComponent, EntityType.APPLICATION_COMPONENT, user_id, my_vote
                )
            )
        return list(
            self.session.exec(
                select(ApplicationComponent)
                .where(*conditions)
                .order_by(ApplicationComponent.date.desc())
            ).all()
        )

    def list_for_account(
        self,
        account: Account,
        *,
        statuses: list[ApplicationComponentStatus] | None = None,
        types: list[ApplicationComponentType] | None = None,
        application_ids: list[uuid.UUID] | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        my_vote: str | None = None,
        user_id: uuid.UUID | None = None,
        sort_by: ApplicationComponentSortField = ApplicationComponentSortField.DATE,
        sort_order: SortOrder = SortOrder.DESC,
        page: int = 1,
        limit: int = 25,
    ) -> tuple[list[ApplicationComponent], int, dict[uuid.UUID, str]]:
        """One page of the account's components, across every application.

        Returns `(rows, total, application_titles)` where `application_titles`
        maps each row's `application_id` to its application title (for display
        without a join per row).
        """
        conditions = [
            ApplicationComponent.account_id == account.id,
            ApplicationComponent.enabled.is_(True),
        ]
        if statuses:
            conditions.append(ApplicationComponent.status.in_(statuses))
        if types:
            conditions.append(ApplicationComponent.type.in_(types))
        if application_ids:
            conditions.append(ApplicationComponent.application_id.in_(application_ids))
        if tag_ids:
            conditions.append(tag_overlap(ApplicationComponent, tag_ids))
        if my_vote and user_id:
            conditions.append(
                my_vote_filter(
                    ApplicationComponent, EntityType.APPLICATION_COMPONENT, user_id, my_vote
                )
            )

        base = select(ApplicationComponent).where(*conditions)
        total = self.session.exec(select(func.count()).select_from(base.subquery())).one()

        column = _SORT_COLUMNS[sort_by]
        ordering = column.asc() if sort_order == SortOrder.ASC else column.desc()
        rows = list(
            self.session.exec(
                base.order_by(ordering).offset((page - 1) * limit).limit(limit)
            ).all()
        )
        return rows, total, self._application_titles(rows)

    def _application_titles(self, rows: list[ApplicationComponent]) -> dict[uuid.UUID, str]:
        """Titles of the applications the rows belong to, keyed by application id."""
        application_ids = {row.application_id for row in rows}
        if not application_ids:
            return {}
        found = self.session.exec(
            select(Application.id, Application.title).where(
                Application.id.in_(application_ids), Application.enabled.is_(True)
            )
        ).all()
        return {application_id: title for application_id, title in found}

    def create(
        self,
        application: Application,
        user: User,
        *,
        title: str,
        type: ApplicationComponentType,
        description: dict | None,
        tag_ids: list[uuid.UUID],
    ) -> ApplicationComponent:
        """Create a draft component owned by `user`."""
        now = utc_now()
        component = ApplicationComponent(
            account_id=application.account_id,
            application_id=application.id,
            owner_id=user.id,
            date=now,
            status=ApplicationComponentStatus.DRAFT,
            status_date=now,
            type=type,
            title=title,
            description=description,
            tag_ids=tag_ids,
        )
        return self._persist(component)

    def soft_delete(self, component: ApplicationComponent) -> None:
        """Soft-delete the component and its database-table links."""
        self._guard_unlocked(component)
        now = utc_now()
        self._disable(component, now)
        self._bulk_disable(
            ApplicationComponentDatabaseTable,
            ApplicationComponentDatabaseTable.application_component_id == component.id,
            now=now,
        )
        self.session.commit()
