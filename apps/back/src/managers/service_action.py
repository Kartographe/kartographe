# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Service action lifecycle: listing, creation, status flips and delete."""

import uuid

from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.managers.entity_counts import my_vote_filter
from src.models.enum import EntityType, ServiceActionMethod, ServiceActionStatus, ServiceActionType
from src.models.service import Service
from src.models.service_action import ServiceAction
from src.models.user import User
from src.utils.datetime import utc_now


class ServiceActionManager(BaseEntityManager):
    def list_for_service(
        self,
        service: Service,
        *,
        my_vote: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> list[ServiceAction]:
        """Every enabled action of the service, most recent first."""
        query = select(ServiceAction).where(
            ServiceAction.service_id == service.id,
            ServiceAction.enabled.is_(True),
        )
        if my_vote and user_id:
            query = query.where(
                my_vote_filter(ServiceAction, EntityType.SERVICE_ACTION, user_id, my_vote)
            )
        return list(
            self.session.exec(query.order_by(ServiceAction.date.desc())).all()
        )

    def create(
        self,
        service: Service,
        user: User,
        *,
        type: ServiceActionType,
        title: str,
        description: dict | None,
        method: ServiceActionMethod | None,
        path: str | None,
    ) -> ServiceAction:
        """Create a draft action owned by `user`."""
        now = utc_now()
        action = ServiceAction(
            account_id=service.account_id,
            service_id=service.id,
            owner_id=user.id,
            date=now,
            type=type,
            status=ServiceActionStatus.DRAFT,
            status_date=now,
            title=title,
            description=description,
            method=method,
            path=path,
        )
        return self._persist(action)

    def soft_delete(self, action: ServiceAction) -> None:
        """Soft-delete a single action."""
        self._guard_unlocked(action)
        now = utc_now()
        self._disable(action, now)
        self.session.commit()
