"""Route/table link lifecycle: creation/update with table validation, delete."""

import uuid

from fastapi import HTTPException, status
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.application_route import ApplicationRoute
from src.models.application_route_table import ApplicationRouteTable
from src.models.database_table import DatabaseTable
from src.models.enum import ApplicationRouteTableAction, ApplicationRouteTableType
from src.utils.datetime import utc_now


class ApplicationRouteTableManager(BaseEntityManager):
    def list_for_route(self, route: ApplicationRoute) -> list[ApplicationRouteTable]:
        """Every enabled table link of the route, in insertion order."""
        return list(
            self.session.exec(
                select(ApplicationRouteTable)
                .where(
                    ApplicationRouteTable.application_route_id == route.id,
                    ApplicationRouteTable.enabled.is_(True),
                )
                .order_by(ApplicationRouteTable.created_at.asc())
            ).all()
        )

    def _assert_table_in_account(self, route: ApplicationRoute, database_table_id: uuid.UUID) -> None:
        table = self.session.get(DatabaseTable, database_table_id)
        if table is None or not table.enabled or table.account_id != route.account_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Database table not found in this account.")

    def create(
        self,
        route: ApplicationRoute,
        *,
        database_table_id: uuid.UUID,
        type: ApplicationRouteTableType,
        action: ApplicationRouteTableAction,
    ) -> ApplicationRouteTable:
        """Link the route to a database table of the same account."""
        self._assert_table_in_account(route, database_table_id)
        link = ApplicationRouteTable(
            account_id=route.account_id,
            application_id=route.application_id,
            application_route_id=route.id,
            database_table_id=database_table_id,
            type=type,
            action=action,
        )
        return self._persist(link)

    def update(
        self, route: ApplicationRoute, link: ApplicationRouteTable, fields: dict
    ) -> ApplicationRouteTable:
        """Apply a partial update, validating the table reference when it changes."""
        if fields.get("database_table_id") is not None:
            self._assert_table_in_account(route, fields["database_table_id"])
        return self.apply_update(link, fields)

    def soft_delete(self, link: ApplicationRouteTable) -> None:
        now = utc_now()
        self._disable(link, now)
        self.session.commit()
