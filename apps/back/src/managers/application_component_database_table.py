# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Component/table link lifecycle: creation and update with table validation,
listing, delete.

Listings resolve the linked tables in one batched query: a link stores only a
`database_table_id`, and a table is reachable only through its database and its
version, so a client given the bare id could not name what the link points at.
"""

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
from src.serializes.application_components import ApplicationComponentDatabaseTableItem
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

    def to_items(
        self, links: list[ApplicationComponentDatabaseTable]
    ) -> list[ApplicationComponentDatabaseTableItem]:
        """Serialize links with their table's name, database and version filled in."""
        tables = self._tables_for(links)
        items = []
        for link in links:
            table = tables.get(link.database_table_id)
            items.append(
                ApplicationComponentDatabaseTableItem.model_validate(link).model_copy(
                    update={
                        "database_id": table[0] if table else None,
                        "database_version_id": table[1] if table else None,
                        "database_table_name": table[2] if table else None,
                    }
                )
            )
        return items

    def to_item(
        self, link: ApplicationComponentDatabaseTable
    ) -> ApplicationComponentDatabaseTableItem:
        return self.to_items([link])[0]

    def _tables_for(
        self, links: list[ApplicationComponentDatabaseTable]
    ) -> dict[uuid.UUID, tuple[uuid.UUID, uuid.UUID, str]]:
        """`(database_id, database_version_id, name)` per linked table id."""
        table_ids = {link.database_table_id for link in links}
        if not table_ids:
            return {}
        rows = self.session.exec(
            select(
                DatabaseTable.id,
                DatabaseTable.database_id,
                DatabaseTable.database_version_id,
                DatabaseTable.name,
            ).where(DatabaseTable.id.in_(table_ids), DatabaseTable.enabled.is_(True))
        ).all()
        return {row[0]: (row[1], row[2], row[3]) for row in rows}

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
