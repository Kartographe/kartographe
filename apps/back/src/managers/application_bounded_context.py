# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Bounded-context lifecycle: creation and update with component validation,
listing inside an application or across the account, and soft-delete.

Updates and lock/unlock come from `BaseEntityManager`. The referenced components
are re-checked against the context's own application on every write: a context
draws a boundary inside one application, so an id from another one is a 404, not
a silently stored dangling reference.
"""

import uuid

from fastapi import HTTPException, status
from sqlmodel import func, select

from src.filters._base import SortOrder
from src.filters.application_bounded_contexts import ApplicationBoundedContextSortField
from src.managers._base import BaseEntityManager
from src.managers._arrays import uuid_array_overlap
from src.managers.entity_counts import my_complexity_filter, my_vote_filter
from src.models.account import Account
from src.models.application import Application
from src.models.application_bounded_context import ApplicationBoundedContext
from src.models.application_component import ApplicationComponent
from src.models.enum import EntityType
from src.models.user import User
from src.utils.datetime import utc_now

_SORT_COLUMNS = {
    ApplicationBoundedContextSortField.DATE: ApplicationBoundedContext.date,
    ApplicationBoundedContextSortField.TITLE: ApplicationBoundedContext.title,
}


class ApplicationBoundedContextManager(BaseEntityManager):
    def list_for_application(
        self,
        application: Application,
        *,
        component_ids: list[uuid.UUID] | None = None,
        my_vote: str | None = None,
        my_complexity: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> list[ApplicationBoundedContext]:
        """Every enabled bounded context of the application, most recent first.

        `component_ids` keeps only the contexts holding at least one of those
        components.
        """
        conditions = [
            ApplicationBoundedContext.application_id == application.id,
            ApplicationBoundedContext.enabled.is_(True),
        ]
        if component_ids:
            conditions.append(
                uuid_array_overlap(
                    ApplicationBoundedContext.application_component_ids, component_ids
                )
            )
        if my_vote and user_id:
            conditions.append(
                my_vote_filter(
                    ApplicationBoundedContext,
                    EntityType.APPLICATION_BOUNDED_CONTEXT,
                    user_id,
                    my_vote,
                )
            )
        if my_complexity and user_id:
            conditions.append(
                my_complexity_filter(
                    ApplicationBoundedContext,
                    EntityType.APPLICATION_BOUNDED_CONTEXT,
                    user_id,
                    my_complexity,
                )
            )
        return list(
            self.session.exec(
                select(ApplicationBoundedContext)
                .where(*conditions)
                .order_by(ApplicationBoundedContext.date.desc())
            ).all()
        )

    def list_for_account(
        self,
        account: Account,
        *,
        application_ids: list[uuid.UUID] | None = None,
        component_ids: list[uuid.UUID] | None = None,
        my_vote: str | None = None,
        my_complexity: str | None = None,
        user_id: uuid.UUID | None = None,
        sort_by: ApplicationBoundedContextSortField = ApplicationBoundedContextSortField.DATE,
        sort_order: SortOrder = SortOrder.DESC,
        page: int = 1,
        limit: int = 25,
    ) -> tuple[list[ApplicationBoundedContext], int, dict[uuid.UUID, str]]:
        """One page of the account's bounded contexts, across every application.

        Returns `(rows, total, application_titles)` where `application_titles`
        maps each row's `application_id` to its application title (for display
        without a join per row).
        """
        conditions = [
            ApplicationBoundedContext.account_id == account.id,
            ApplicationBoundedContext.enabled.is_(True),
        ]
        if application_ids:
            conditions.append(ApplicationBoundedContext.application_id.in_(application_ids))
        if component_ids:
            conditions.append(
                uuid_array_overlap(
                    ApplicationBoundedContext.application_component_ids, component_ids
                )
            )
        if my_vote and user_id:
            conditions.append(
                my_vote_filter(
                    ApplicationBoundedContext,
                    EntityType.APPLICATION_BOUNDED_CONTEXT,
                    user_id,
                    my_vote,
                )
            )

        if my_complexity and user_id:
            conditions.append(
                my_complexity_filter(
                    ApplicationBoundedContext,
                    EntityType.APPLICATION_BOUNDED_CONTEXT,
                    user_id,
                    my_complexity,
                )
            )

        base = select(ApplicationBoundedContext).where(*conditions)
        total = self.session.exec(select(func.count()).select_from(base.subquery())).one()

        column = _SORT_COLUMNS[sort_by]
        ordering = column.asc() if sort_order == SortOrder.ASC else column.desc()
        rows = list(
            self.session.exec(
                base.order_by(ordering).offset((page - 1) * limit).limit(limit)
            ).all()
        )
        return rows, total, self._application_titles(rows)

    def _application_titles(
        self, rows: list[ApplicationBoundedContext]
    ) -> dict[uuid.UUID, str]:
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

    def _assert_components_in_application(
        self, application: Application, component_ids: list[uuid.UUID] | None
    ) -> None:
        """Every referenced component must live in the same application."""
        if not component_ids:
            return
        unique = set(component_ids)
        found = set(
            self.session.exec(
                select(ApplicationComponent.id).where(
                    ApplicationComponent.application_id == application.id,
                    ApplicationComponent.id.in_(unique),
                    ApplicationComponent.enabled.is_(True),
                )
            ).all()
        )
        missing = unique - found
        if missing:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                "Component(s) not found on this application: "
                f"{', '.join(str(m) for m in sorted(missing, key=str))}.",
            )

    def create(
        self,
        application: Application,
        user: User,
        *,
        title: str,
        description: dict | None,
        application_component_ids: list[uuid.UUID],
    ) -> ApplicationBoundedContext:
        """Create a bounded context owned by `user`."""
        self._assert_components_in_application(application, application_component_ids)
        context = ApplicationBoundedContext(
            account_id=application.account_id,
            application_id=application.id,
            owner_id=user.id,
            date=utc_now(),
            title=title,
            description=description,
            application_component_ids=application_component_ids,
        )
        return self._persist(context)

    def update(
        self,
        application: Application,
        context: ApplicationBoundedContext,
        fields: dict,
    ) -> ApplicationBoundedContext:
        """Apply a partial update, validating the components when they change."""
        if "application_component_ids" in fields:
            self._assert_components_in_application(
                application, fields["application_component_ids"]
            )
        return self.apply_update(context, fields)

    def soft_delete(self, context: ApplicationBoundedContext) -> None:
        self._guard_unlocked(context)
        self._disable(context, utc_now())
        self.session.commit()
