# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Index lifecycle: creation/update with column validation, listing, delete.

An index covers one or more columns of its table; every referenced column is
checked to belong to that table and to be enabled.
"""

import uuid

from fastapi import HTTPException, status
from sqlmodel import col, select

from src.managers._base import BaseEntityManager
from src.models.database_table import DatabaseTable
from src.models.database_table_column import DatabaseTableColumn
from src.models.database_table_index import DatabaseTableIndex
from src.models.enum import IndexType
from src.utils.datetime import utc_now


class DatabaseTableIndexManager(BaseEntityManager):
    def list_for_table(self, table: DatabaseTable) -> list[DatabaseTableIndex]:
        """Every enabled index of the table, ordered by rank then insertion."""
        return list(
            self.session.exec(
                select(DatabaseTableIndex)
                .where(
                    DatabaseTableIndex.database_table_id == table.id,
                    DatabaseTableIndex.enabled.is_(True),
                )
                .order_by(DatabaseTableIndex.rank.asc(), DatabaseTableIndex.created_at.asc())
            ).all()
        )

    def _validate_columns(self, table: DatabaseTable, column_ids: list[uuid.UUID]) -> None:
        if not column_ids:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT, "An index needs at least one column."
            )
        found = self.session.exec(
            select(DatabaseTableColumn.id).where(
                col(DatabaseTableColumn.id).in_(column_ids),
                DatabaseTableColumn.database_table_id == table.id,
                DatabaseTableColumn.enabled.is_(True),
            )
        ).all()
        if set(column_ids) - set(found):
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "A referenced column was not found in this table."
            )

    def create(
        self,
        table: DatabaseTable,
        *,
        name: str,
        type: IndexType,
        unique: bool,
        column_ids: list[uuid.UUID],
        where_clause: str | None,
        rank: int,
        description: dict | None,
    ) -> DatabaseTableIndex:
        """Create an index on `table` after validating its columns."""
        self._validate_columns(table, column_ids)
        index = DatabaseTableIndex(
            account_id=table.account_id,
            database_table_id=table.id,
            name=name,
            type=type,
            unique=unique,
            column_ids=column_ids,
            where_clause=where_clause,
            rank=rank,
            description=description,
        )
        return self._persist(index)

    def update(
        self, table: DatabaseTable, index: DatabaseTableIndex, fields: dict
    ) -> DatabaseTableIndex:
        """Apply a partial update, re-validating columns when they change."""
        if "column_ids" in fields:
            self._validate_columns(table, fields["column_ids"])
        return self.apply_update(index, fields)

    def soft_delete(self, index: DatabaseTableIndex) -> None:
        now = utc_now()
        self._disable(index, now)
        self.session.commit()
