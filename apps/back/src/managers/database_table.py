"""Table lifecycle: listing, creation (with nested columns), status flips,
cascading delete and item building.

Columns can be managed inline (created with the table, fully replaced on a table
update that sends `columns`) or individually via the columns routes.
"""

import uuid

from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.managers.database_table_column import DatabaseTableColumnManager
from src.models.database_table import DatabaseTable
from src.models.database_table_column import DatabaseTableColumn
from src.models.database_version import DatabaseVersion
from src.models.enum import DatabaseTableStatus, DatabaseTableType
from src.models.user import User
from src.serializes.databases import DatabaseTableColumnItem, DatabaseTableItem
from src.utils.datetime import utc_now


class DatabaseTableManager(BaseEntityManager):
    def __init__(self, session):
        super().__init__(session)
        self._columns = DatabaseTableColumnManager(session)

    def to_item(self, table: DatabaseTable, *, with_columns: bool = False) -> DatabaseTableItem:
        item = DatabaseTableItem.model_validate(table)
        if with_columns:
            item.columns = [
                DatabaseTableColumnItem.model_validate(column)
                for column in self._columns.list_for_table(table)
            ]
        return item

    def to_items(self, tables: list[DatabaseTable]) -> list[DatabaseTableItem]:
        """Serialize a listing with each table's columns, in a single column query."""
        grouped = self._columns.group_by_table([table.id for table in tables])
        items = []
        for table in tables:
            item = DatabaseTableItem.model_validate(table)
            item.columns = [
                DatabaseTableColumnItem.model_validate(column) for column in grouped[table.id]
            ]
            items.append(item)
        return items

    def list_for_version(self, version: DatabaseVersion) -> list[DatabaseTable]:
        """Every enabled table of the version, most recent first."""
        return list(
            self.session.exec(
                select(DatabaseTable)
                .where(
                    DatabaseTable.database_version_id == version.id,
                    DatabaseTable.enabled.is_(True),
                )
                .order_by(DatabaseTable.date.desc())
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
        now = utc_now()
        self._disable(table, now)
        self._bulk_disable(
            DatabaseTableColumn, DatabaseTableColumn.database_table_id == table.id, now=now
        )
        self.session.commit()
