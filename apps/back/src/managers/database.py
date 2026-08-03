# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Database lifecycle: listing, creation, status flips and cascading delete."""

import uuid

from sqlmodel import func, select

from src.filters._base import SortOrder
from src.filters.databases import DatabaseSortField
from src.managers._base import BaseEntityManager
from src.managers.entity_counts import my_complexity_filter, my_vote_filter
from src.managers.tagging import tag_overlap
from src.models.account import Account
from src.models.database import Database
from src.models.database_table import DatabaseTable
from src.models.database_table_column import DatabaseTableColumn
from src.models.database_version import DatabaseVersion
from src.models.enum import DatabaseStatus, DatabaseType, EntityType
from src.models.user import User
from src.utils.datetime import utc_now

_SORT_COLUMNS = {
    DatabaseSortField.DATE: Database.date,
    DatabaseSortField.TITLE: Database.title,
    DatabaseSortField.STATUS: Database.status,
    DatabaseSortField.TYPE: Database.type,
}


class DatabaseManager(BaseEntityManager):
    def list_for_account(
        self,
        account: Account,
        *,
        statuses: list[DatabaseStatus] | None = None,
        types: list[DatabaseType] | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        my_vote: str | None = None,
        my_complexity: str | None = None,
        user_id: uuid.UUID | None = None,
        sort_by: DatabaseSortField = DatabaseSortField.DATE,
        sort_order: SortOrder = SortOrder.DESC,
        page: int = 1,
        limit: int = 25,
    ) -> tuple[list[Database], int]:
        """One page of the account's databases. Returns `(rows, total)`."""
        conditions = [Database.account_id == account.id, Database.enabled.is_(True)]
        if statuses:
            conditions.append(Database.status.in_(statuses))
        if types:
            conditions.append(Database.type.in_(types))
        if tag_ids:
            conditions.append(tag_overlap(Database, tag_ids))
        if my_vote and user_id:
            conditions.append(my_vote_filter(Database, EntityType.DATABASE, user_id, my_vote))

        if my_complexity and user_id:
            conditions.append(my_complexity_filter(Database, EntityType.DATABASE, user_id, my_complexity))

        base = select(Database).where(*conditions)
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
        type: DatabaseType,
        title: str,
        description: dict | None,
        tag_ids: list[uuid.UUID],
    ) -> Database:
        """Create a draft database owned by `user`."""
        now = utc_now()
        database = Database(
            account_id=account.id,
            owner_id=user.id,
            date=now,
            type=type,
            status=DatabaseStatus.DRAFT,
            status_date=now,
            title=title,
            description=description,
            tag_ids=tag_ids,
        )
        return self._persist(database)

    def soft_delete(self, database: Database) -> None:
        """Soft-delete the database with its versions, tables and columns."""
        self._guard_unlocked(database)
        now = utc_now()
        table_ids = self.session.exec(
            select(DatabaseTable.id).where(
                DatabaseTable.database_id == database.id, DatabaseTable.enabled.is_(True)
            )
        ).all()
        self._disable(database, now)
        self._bulk_disable(DatabaseVersion, DatabaseVersion.database_id == database.id, now=now)
        self._bulk_disable(DatabaseTable, DatabaseTable.database_id == database.id, now=now)
        if table_ids:
            self._bulk_disable(
                DatabaseTableColumn, DatabaseTableColumn.database_table_id.in_(table_ids), now=now
            )
        self.session.commit()
