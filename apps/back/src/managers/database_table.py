# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Table lifecycle: listing, creation (with nested columns), status flips,
cascading delete and item building.

Columns can be managed inline (created with the table, fully replaced on a table
update that sends `columns`) or individually via the columns routes.
"""

import uuid

from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.managers.database_table_column import DatabaseTableColumnManager
from src.managers.entity_counts import my_vote_filter
from src.managers.tag import TagManager
from src.managers.tagging import tag_overlap
from src.models.database_table import DatabaseTable
from src.models.database_table_column import DatabaseTableColumn
from src.models.database_version import DatabaseVersion
from src.models.enum import DatabaseTableStatus, DatabaseTableType, EntityType
from src.models.user import User
from src.serializes.databases import DatabaseTableColumnItem, DatabaseTableItem
from src.utils.datetime import utc_now


class DatabaseTableManager(BaseEntityManager):
    def __init__(self, session):
        super().__init__(session)
        self._columns = DatabaseTableColumnManager(session)
        self._tags = TagManager(session)

    def to_item(self, table: DatabaseTable, *, with_columns: bool = False) -> DatabaseTableItem:
        columns = self._columns.list_for_table(table) if with_columns else []
        # Tables and columns are both tagged: one index covers the whole tree.
        index = self._tags.index_for([table, *columns])
        item = self._tags.serialize(table, DatabaseTableItem, index)
        if with_columns:
            # Left as `None` otherwise — the field means "not resolved", not "empty".
            item.columns = self._tags.attach(columns, DatabaseTableColumnItem, index)
        return item

    def to_items(self, tables: list[DatabaseTable]) -> list[DatabaseTableItem]:
        """Serialize a listing with each table's columns, in a single column query."""
        grouped = self._columns.group_by_table([table.id for table in tables])
        columns = [column for table in tables for column in grouped[table.id]]
        index = self._tags.index_for([*tables, *columns])
        items = []
        for table in tables:
            item = self._tags.serialize(table, DatabaseTableItem, index)
            item.columns = self._tags.attach(grouped[table.id], DatabaseTableColumnItem, index)
            items.append(item)
        return items

    def list_for_version(
        self,
        version: DatabaseVersion,
        *,
        tag_ids: list[uuid.UUID] | None = None,
        my_vote: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> list[DatabaseTable]:
        """Every enabled table of the version, most recent first.

        `tag_ids` keeps only the rows carrying at least one of those tags.
        """
        conditions = [DatabaseTable.database_version_id == version.id, DatabaseTable.enabled.is_(True)]
        if tag_ids:
            conditions.append(tag_overlap(DatabaseTable, tag_ids))
        if my_vote and user_id:
            conditions.append(my_vote_filter(DatabaseTable, EntityType.DATABASE_TABLE, user_id, my_vote))
        return list(
            self.session.exec(
                select(DatabaseTable).where(*conditions).order_by(DatabaseTable.date.desc())
            ).all()
        )

    def _add_columns(self, table: DatabaseTable, user: User, column_forms) -> None:
        for column_form in column_forms:
            self._columns.create(
                table,
                user,
                database_column_type_id=column_form.database_column_type_id,
                foreign_key_database_table_id=column_form.foreign_key_database_table_id,
                foreign_key_database_table_column_id=column_form.foreign_key_database_table_column_id,
                nullable=column_form.nullable,
                unique=column_form.unique,
                system_field=column_form.system_field,
                rank=column_form.rank,
                default_value=column_form.default_value,
                name=column_form.name,
                description=column_form.description,
                color=column_form.color,
                tag_ids=column_form.tag_ids,
                commit=False,
            )

    def create(
        self,
        version: DatabaseVersion,
        user: User,
        *,
        type: DatabaseTableType,
        schema: str,
        name: str,
        description: dict | None,
        color: str | None,
        column_forms,
        tag_ids: list[uuid.UUID],
    ) -> DatabaseTable:
        """Create a draft table and its columns in one transaction."""
        now = utc_now()
        table = DatabaseTable(
            account_id=version.account_id,
            database_id=version.database_id,
            database_version_id=version.id,
            owner_id=user.id,
            type=type,
            date=now,
            status=DatabaseTableStatus.DRAFT,
            status_date=now,
            table_schema=schema,
            name=name,
            description=description,
            color=color,
            tag_ids=tag_ids,
        )
        self.session.add(table)
        self.session.flush()  # assign table.id before columns reference it
        self._add_columns(table, user, column_forms)
        self.session.commit()
        self.session.refresh(table)
        return table

    def update(
        self, table: DatabaseTable, user: User, *, fields: dict, column_forms
    ) -> DatabaseTable:
        """Update scalar fields; if `column_forms` is not None, replace columns."""
        if column_forms is not None:
            self._bulk_disable(
                DatabaseTableColumn,
                DatabaseTableColumn.database_table_id == table.id,
                now=utc_now(),
            )
            self._add_columns(table, user, column_forms)
        for key, value in fields.items():
            setattr(table, key, value)
        table.updated_at = utc_now()
        self.session.add(table)
        self.session.commit()
        self.session.refresh(table)
        return table

    def soft_delete(self, table: DatabaseTable) -> None:
        """Soft-delete the table and its columns."""
        self._guard_unlocked(table)
        now = utc_now()
        self._disable(table, now)
        self._bulk_disable(
            DatabaseTableColumn, DatabaseTableColumn.database_table_id == table.id, now=now
        )
        self.session.commit()
