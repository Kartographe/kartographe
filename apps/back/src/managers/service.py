# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Service lifecycle: listing, creation, status flips and cascading delete."""

import uuid

from sqlmodel import func, select

from src.filters._base import SortOrder
from src.filters.services import ServiceSortField
from src.managers._base import BaseEntityManager
from src.managers.entity_counts import my_vote_filter
from src.models.account import Account
from src.models.enum import EntityType, ServiceStatus, ServiceType
from src.models.service import Service
from src.models.service_action import ServiceAction
from src.models.user import User
from src.utils.datetime import utc_now

_SORT_COLUMNS = {
    ServiceSortField.DATE: Service.date,
    ServiceSortField.TITLE: Service.title,
    ServiceSortField.STATUS: Service.status,
    ServiceSortField.TYPE: Service.type,
}


class ServiceManager(BaseEntityManager):
    def list_for_account(
        self,
        account: Account,
        *,
        statuses: list[ServiceStatus] | None = None,
        types: list[ServiceType] | None = None,
        my_vote: str | None = None,
        user_id: uuid.UUID | None = None,
        sort_by: ServiceSortField = ServiceSortField.DATE,
        sort_order: SortOrder = SortOrder.DESC,
        page: int = 1,
        limit: int = 25,
    ) -> tuple[list[Service], int]:
        """One page of the account's services. Returns `(rows, total)`."""
        conditions = [Service.account_id == account.id, Service.enabled.is_(True)]
        if statuses:
            conditions.append(Service.status.in_(statuses))
        if types:
            conditions.append(Service.type.in_(types))
        if my_vote and user_id:
            conditions.append(my_vote_filter(Service, EntityType.SERVICE, user_id, my_vote))

        base = select(Service).where(*conditions)
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
        type: ServiceType,
        title: str,
        description: dict | None,
        picture_path: str | None,
        url: str | None,
        openapi_url: str | None,
    ) -> Service:
        """Create a draft service owned by `user`."""
        now = utc_now()
        service = Service(
            account_id=account.id,
            owner_id=user.id,
            date=now,
            type=type,
            status=ServiceStatus.DRAFT,
            status_date=now,
            title=title,
            description=description,
            picture_path=picture_path,
            url=url,
            openapi_url=openapi_url,
        )
        return self._persist(service)

    def soft_delete(self, service: Service) -> None:
        """Soft-delete the service and its actions."""
        self._guard_unlocked(service)
        now = utc_now()
        self._disable(service, now)
        self._bulk_disable(ServiceAction, ServiceAction.service_id == service.id, now=now)
        self.session.commit()
