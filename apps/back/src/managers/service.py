# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Service lifecycle: listing, creation, status flips and cascading delete."""

import uuid

from fastapi import UploadFile
from sqlmodel import func, select

from src.filters._base import SortOrder
from src.filters.services import ServiceSortField
from src.managers._base import BaseEntityManager
from src.managers.entity_counts import my_complexity_filter, my_vote_filter
from src.managers.files import FileManager
from src.models.account import Account
from src.models.enum import EntityType, ServiceCategory, ServiceStatus, ServiceType
from src.models.service import Service
from src.models.service_action import ServiceAction
from src.models.user import User
from src.serializes.services import ServiceItem
from src.utils.datetime import utc_now

_SORT_COLUMNS = {
    ServiceSortField.DATE: Service.date,
    ServiceSortField.TITLE: Service.title,
    ServiceSortField.STATUS: Service.status,
    ServiceSortField.TYPE: Service.type,
    ServiceSortField.CATEGORY: Service.category,
}

# Side length (px) of the stored square service picture; mirrors accounts.
_SERVICE_PICTURE_SIZE = 512


class ServiceManager(BaseEntityManager):
    def __init__(self, session) -> None:
        super().__init__(session)
        self._files = FileManager()

    def to_item(self, service: Service) -> ServiceItem:
        """Serialize a service, resolving `picture_path` to a public URL.

        The row stores a storage key; the API exposes the public URL — same
        mechanism as the account logo.
        """
        item = ServiceItem.model_validate(service)
        item.picture_path = self._files.public_url_for(service.picture_path)
        return item

    def list_for_account(
        self,
        account: Account,
        *,
        statuses: list[ServiceStatus] | None = None,
        types: list[ServiceType] | None = None,
        categories: list[ServiceCategory] | None = None,
        my_vote: str | None = None,
        my_complexity: str | None = None,
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
        if categories:
            conditions.append(Service.category.in_(categories))
        if my_vote and user_id:
            conditions.append(my_vote_filter(Service, EntityType.SERVICE, user_id, my_vote))

        if my_complexity and user_id:
            conditions.append(my_complexity_filter(Service, EntityType.SERVICE, user_id, my_complexity))

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
        category: ServiceCategory,
        title: str,
        description: dict | None,
        url: str | None,
        openapi_url: str | None,
    ) -> Service:
        """Create a draft service owned by `user`.

        The picture is set afterwards through `set_picture`; a new service has
        none.
        """
        now = utc_now()
        service = Service(
            account_id=account.id,
            owner_id=user.id,
            date=now,
            type=type,
            category=category,
            status=ServiceStatus.DRAFT,
            status_date=now,
            title=title,
            description=description,
            picture_path=None,
            url=url,
            openapi_url=openapi_url,
        )
        return self._persist(service)

    def set_picture(self, service: Service, file: UploadFile) -> Service:
        """Store a square-cropped picture and replace the previous one."""
        self._guard_unlocked(service)
        previous_key = service.picture_path
        key = self._files.save_image(
            file, prefix=f"services/{service.id}/picture", square_size=_SERVICE_PICTURE_SIZE
        )
        service.picture_path = key
        service.updated_at = utc_now()
        self.session.add(service)
        self.session.commit()
        self.session.refresh(service)
        if previous_key and previous_key != key:
            self._files.delete(previous_key)
        return service

    def soft_delete(self, service: Service) -> None:
        """Soft-delete the service and its actions."""
        self._guard_unlocked(service)
        now = utc_now()
        self._disable(service, now)
        self._bulk_disable(ServiceAction, ServiceAction.service_id == service.id, now=now)
        self.session.commit()
