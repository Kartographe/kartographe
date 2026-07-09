"""Service action lifecycle: listing, creation, status flips and delete."""

from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.enum import ServiceActionMethod, ServiceActionStatus, ServiceActionType
from src.models.service import Service
from src.models.service_action import ServiceAction
from src.models.user import User
from src.utils.datetime import utc_now


class ServiceActionManager(BaseEntityManager):
    def list_for_service(self, service: Service) -> list[ServiceAction]:
        """Every enabled action of the service, most recent first."""
        return list(
            self.session.exec(
                select(ServiceAction)
                .where(
                    ServiceAction.service_id == service.id,
                    ServiceAction.enabled.is_(True),
                )
                .order_by(ServiceAction.date.desc())
            ).all()
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
        now = utc_now()
        self._disable(action, now)
        self.session.commit()
