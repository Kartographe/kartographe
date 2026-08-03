# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Component/table link lifecycle: creation and update with table validation,
listing, delete."""

import uuid

from fastapi import HTTPException, status
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.application_component import ApplicationComponent
from src.models.application_component_database_table import (
    ApplicationComponentDatabaseTable,
)
from src.models.database_table import DatabaseTable
from src.models.user import User
from src.utils.datetime import utc_now


class ApplicationComponentDatabaseTableManager(BaseEntityManager):
    def list_for_component(
        self, component: ApplicationComponent
    ) -> list[ApplicationComponentDatabaseTable]:
        """Every enabled table link of the component, in insertion order."""
        return list(
            self.session.exec(
                select(ApplicationComponentDatabaseTable)
                .where(
                    ApplicationComponentDatabaseTable.application_component_id == component.id,
                    ApplicationComponentDatabaseTable.enabled.is_(True),
                )
                .order_by(ApplicationComponentDatabaseTable.created_at.asc())
            ).all()
        )

    def _assert_table_in_account(
        self, component: ApplicationComponent, database_table_id: uuid.UUID
    ) -> None:
        table = self.session.get(DatabaseTable, database_table_id)
        if table is None or not table.enabled or table.account_id != component.account_id:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "Database table not found in this account."
            )

    def create(
        self,
        component: ApplicationComponent,
        user: User,
        *,
        database_table_id: uuid.UUID,
        description: dict | None,
    ) -> ApplicationComponentDatabaseTable:
        """Link the component to a database table of the same account."""
        self._assert_table_in_account(component, database_table_id)
        link = ApplicationComponentDatabaseTable(
            account_id=component.account_id,
            application_id=component.application_id,
            application_component_id=component.id,
            database_table_id=database_table_id,
            owner_id=user.id,
            date=utc_now(),
            description=description,
        )
        return self._persist(link)

    def update(
        self,
        component: ApplicationComponent,
        link: ApplicationComponentDatabaseTable,
        fields: dict,
    ) -> ApplicationComponentDatabaseTable:
        """Apply a partial update, validating the table reference when it changes."""
        if fields.get("database_table_id") is not None:
            self._assert_table_in_account(component, fields["database_table_id"])
        return self.apply_update(link, fields)

    def soft_delete(self, link: ApplicationComponentDatabaseTable) -> None:
        self._disable(link, utc_now())
        self.session.commit()
