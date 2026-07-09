"""Column lifecycle: creation/update with reference validation, delete.

A column always references a catalogued `DatabaseColumnType`. It may also model a
foreign key by pointing at another table of the same account and, optionally, a
specific column of that table.
"""

import uuid
from collections import defaultdict

from fastapi import HTTPException, status
from sqlmodel import col, select

from src.managers._base import BaseEntityManager
from src.models.database_column_type import DatabaseColumnType
from src.models.database_table import DatabaseTable
from src.models.database_table_column import DatabaseTableColumn
from src.models.user import User
from src.utils.datetime import utc_now


class DatabaseTableColumnManager(BaseEntityManager):
    def list_for_table(self, table: DatabaseTable) -> list[DatabaseTableColumn]:
        """Every enabled column of the table, ordered by rank then insertion."""
        return list(
            self.session.exec(
                select(DatabaseTableColumn)
                .where(
                    DatabaseTableColumn.database_table_id == table.id,
                    DatabaseTableColumn.enabled.is_(True),
                )
                .order_by(DatabaseTableColumn.rank.asc(), DatabaseTableColumn.created_at.asc())
            ).all()
        )

    def group_by_table(
        self, table_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, list[DatabaseTableColumn]]:
        """Enabled columns of several tables at once, keyed by table id.

        Same ordering as `list_for_table`; one query instead of one per table.
        """
        grouped: dict[uuid.UUID, list[DatabaseTableColumn]] = defaultdict(list)
        if not table_ids:
            return grouped
        rows = self.session.exec(
            select(DatabaseTableColumn)
            .where(
                col(DatabaseTableColumn.database_table_id).in_(table_ids),
                DatabaseTableColumn.enabled.is_(True),
            )
            .order_by(DatabaseTableColumn.rank.asc(), DatabaseTableColumn.created_at.asc())
        ).all()
        for column in rows:
            grouped[column.database_table_id].append(column)
        return grouped

    def _validate_refs(
        self,
        table: DatabaseTable,
        *,
        database_column_type_id: uuid.UUID,
        foreign_key_database_table_id: uuid.UUID | None,
        foreign_key_database_table_column_id: uuid.UUID | None,
    ) -> None:
        column_type = self.session.get(DatabaseColumnType, database_column_type_id)
        if column_type is None or not column_type.enabled:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Column type not found.")

        if foreign_key_database_table_id is not None:
            fk_table = self.session.get(DatabaseTable, foreign_key_database_table_id)
            if fk_table is None or not fk_table.enabled or fk_table.account_id != table.account_id:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND, "Referenced table not found in this account."
                )
        if foreign_key_database_table_column_id is not None:
            if foreign_key_database_table_id is None:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_CONTENT,
                    "A referenced column requires a referenced table.",
                )
            fk_column = self.session.get(DatabaseTableColumn, foreign_key_database_table_column_id)
            if (
                fk_column is None
                or not fk_column.enabled
                or fk_column.database_table_id != foreign_key_database_table_id
            ):
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND, "Referenced column not found in the referenced table."
                )

    def create(
        self,
        table: DatabaseTable,
        user: User,
        *,
        database_column_type_id: uuid.UUID,
        foreign_key_database_table_id: uuid.UUID | None,
        foreign_key_database_table_column_id: uuid.UUID | None,
        nullable: bool,
        unique: bool,
        system_field: bool,
        rank: int,
        default_value: str,
        name: str,
        description: dict | None,
        color: str | None = None,
        tag_ids: list[uuid.UUID] | None = None,
        commit: bool = True,
    ) -> DatabaseTableColumn:
        """Create a column on `table` after validating its references.

        `commit=False` lets a caller (a table create/update) batch several
        columns and commit once.
        """
        self._validate_refs(
            table,
            database_column_type_id=database_column_type_id,
            foreign_key_database_table_id=foreign_key_database_table_id,
            foreign_key_database_table_column_id=foreign_key_database_table_column_id,
        )
        column = DatabaseTableColumn(
            account_id=table.account_id,
            database_table_id=table.id,
            database_column_type_id=database_column_type_id,
            foreign_key_database_table_id=foreign_key_database_table_id,
            foreign_key_database_table_column_id=foreign_key_database_table_column_id,
            owner_id=user.id,
            date=utc_now(),
            nullable=nullable,
            unique=unique,
            system_field=system_field,
            rank=rank,
            default_value=default_value,
            name=name,
            description=description,
            color=color,
            tag_ids=tag_ids or [],
        )
        self.session.add(column)
        if commit:
            self.session.commit()
            self.session.refresh(column)
        return column

    def update(
        self, table: DatabaseTable, column: DatabaseTableColumn, fields: dict
    ) -> DatabaseTableColumn:
        """Apply a partial update, re-validating references when they change."""
        ref_keys = {
            "database_column_type_id",
            "foreign_key_database_table_id",
            "foreign_key_database_table_column_id",
        }
        if ref_keys & fields.keys():
            self._validate_refs(
                table,
                database_column_type_id=fields.get(
                    "database_column_type_id", column.database_column_type_id
                ),
                foreign_key_database_table_id=fields.get(
                    "foreign_key_database_table_id", column.foreign_key_database_table_id
                ),
                foreign_key_database_table_column_id=fields.get(
                    "foreign_key_database_table_column_id",
                    column.foreign_key_database_table_column_id,
                ),
            )
        return self.apply_update(column, fields)

    def soft_delete(self, column: DatabaseTableColumn) -> None:
        now = utc_now()
        self._disable(column, now)
        self.session.commit()
