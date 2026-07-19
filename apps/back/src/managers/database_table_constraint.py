# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Constraint lifecycle: creation/update with reference validation, delete.

A constraint covers columns of its table; a `foreign_key` constraint also targets
a table of the same account and its columns. Every referenced column is checked
to belong to the expected table and to be enabled.
"""

import uuid

from fastapi import HTTPException, status
from sqlmodel import col, select

from src.managers._base import BaseEntityManager
from src.models.database_table import DatabaseTable
from src.models.database_table_column import DatabaseTableColumn
from src.models.database_table_constraint import DatabaseTableConstraint
from src.models.enum import ConstraintType, ReferentialAction
from src.utils.datetime import utc_now


class DatabaseTableConstraintManager(BaseEntityManager):
    def list_for_table(self, table: DatabaseTable) -> list[DatabaseTableConstraint]:
        """Every enabled constraint of the table, ordered by rank then insertion."""
        return list(
            self.session.exec(
                select(DatabaseTableConstraint)
                .where(
                    DatabaseTableConstraint.database_table_id == table.id,
                    DatabaseTableConstraint.enabled.is_(True),
                )
                .order_by(
                    DatabaseTableConstraint.rank.asc(), DatabaseTableConstraint.created_at.asc()
                )
            ).all()
        )

    def _require_columns(
        self,
        column_ids: list[uuid.UUID],
        expected_table_id: uuid.UUID,
        label: str,
    ) -> None:
        found = self.session.exec(
            select(DatabaseTableColumn.id).where(
                col(DatabaseTableColumn.id).in_(column_ids),
                DatabaseTableColumn.database_table_id == expected_table_id,
                DatabaseTableColumn.enabled.is_(True),
            )
        ).all()
        if set(column_ids) - set(found):
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, f"A {label} was not found in the expected table."
            )

    def _validate(
        self,
        table: DatabaseTable,
        *,
        constraint_type: ConstraintType,
        column_ids: list[uuid.UUID],
        foreign_key_database_table_id: uuid.UUID | None,
        foreign_key_column_ids: list[uuid.UUID],
    ) -> None:
        # A CHECK constraint may be table-level (no columns); others need columns.
        if constraint_type != ConstraintType.CHECK and not column_ids:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                "This constraint needs at least one column.",
            )
        if column_ids:
            self._require_columns(column_ids, table.id, "referenced column")
        if constraint_type == ConstraintType.FOREIGN_KEY:
            if foreign_key_database_table_id is None or not foreign_key_column_ids:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_CONTENT,
                    "A foreign-key constraint needs a referenced table and its columns.",
                )
            fk_table = self.session.get(DatabaseTable, foreign_key_database_table_id)
            if fk_table is None or not fk_table.enabled or fk_table.account_id != table.account_id:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND, "Referenced table not found in this account."
                )
            self._require_columns(foreign_key_column_ids, fk_table.id, "foreign-key column")

    def create(
        self,
        table: DatabaseTable,
        *,
        name: str,
        type: ConstraintType,
        column_ids: list[uuid.UUID],
        check_expression: str | None,
        foreign_key_database_table_id: uuid.UUID | None,
        foreign_key_column_ids: list[uuid.UUID],
        on_delete: ReferentialAction | None,
        on_update: ReferentialAction | None,
        rank: int,
        description: dict | None,
    ) -> DatabaseTableConstraint:
        """Create a constraint on `table` after validating its references."""
        self._validate(
            table,
            constraint_type=type,
            column_ids=column_ids,
            foreign_key_database_table_id=foreign_key_database_table_id,
            foreign_key_column_ids=foreign_key_column_ids,
        )
        constraint = DatabaseTableConstraint(
            account_id=table.account_id,
            database_table_id=table.id,
            name=name,
            type=type,
            column_ids=column_ids,
            check_expression=check_expression,
            foreign_key_database_table_id=foreign_key_database_table_id,
            foreign_key_column_ids=foreign_key_column_ids,
            on_delete=on_delete,
            on_update=on_update,
            rank=rank,
            description=description,
        )
        return self._persist(constraint)

    def update(
        self, table: DatabaseTable, constraint: DatabaseTableConstraint, fields: dict
    ) -> DatabaseTableConstraint:
        """Apply a partial update, re-validating references when they change."""
        ref_keys = {
            "type",
            "column_ids",
            "foreign_key_database_table_id",
            "foreign_key_column_ids",
        }
        if ref_keys & fields.keys():
            self._validate(
                table,
                constraint_type=fields.get("type", constraint.type),
                column_ids=fields.get("column_ids", constraint.column_ids),
                foreign_key_database_table_id=fields.get(
                    "foreign_key_database_table_id", constraint.foreign_key_database_table_id
                ),
                foreign_key_column_ids=fields.get(
                    "foreign_key_column_ids", constraint.foreign_key_column_ids
                ),
            )
        return self.apply_update(constraint, fields)

    def soft_delete(self, constraint: DatabaseTableConstraint) -> None:
        now = utc_now()
        self._disable(constraint, now)
        self.session.commit()
