# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Migration column-step lifecycle: creation/update with reference validation.

Each side of a step is checked against the version it belongs to: a source table
must live in the migration's source version, a destination table in its
destination version, and a referenced column in its own table. A column endpoint
without its table is rejected — the pair is what identifies the value.
"""

import uuid

from fastapi import HTTPException, status
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.managers.entity_counts import my_vote_filter
from src.models.database_migration import DatabaseMigration
from src.models.database_migration_column import DatabaseMigrationColumn
from src.models.database_table import DatabaseTable
from src.models.database_table_column import DatabaseTableColumn
from src.models.database_table_column_subfield import DatabaseTableColumnSubfield
from src.models.enum import DatabaseMigrationColumnStatus, DatabaseMigrationColumnType, EntityType
from src.models.user import User
from src.utils.datetime import utc_now


class DatabaseMigrationColumnManager(BaseEntityManager):
    def list_for_migration(
        self,
        migration: DatabaseMigration,
        *,
        my_vote: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> list[DatabaseMigrationColumn]:
        """Every enabled column step of the migration, in insertion order."""
        query = select(DatabaseMigrationColumn).where(
            DatabaseMigrationColumn.database_migration_id == migration.id,
            DatabaseMigrationColumn.enabled.is_(True),
        )
        if my_vote and user_id:
            query = query.where(
                my_vote_filter(
                    DatabaseMigrationColumn, EntityType.DATABASE_MIGRATION_COLUMN, user_id, my_vote
                )
            )
        return list(
            self.session.exec(query.order_by(DatabaseMigrationColumn.created_at.asc())).all()
        )

    def _validate_side(
        self,
        *,
        table_id: uuid.UUID | None,
        column_id: uuid.UUID | None,
        subfield_id: uuid.UUID | None,
        database_version_id: uuid.UUID,
        label: str,
    ) -> None:
        """Check one side (source or destination) of a column step."""
        if table_id is not None:
            table = self.session.get(DatabaseTable, table_id)
            if table is None or not table.enabled or table.database_version_id != database_version_id:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND,
                    f"{label} table not found in the {label.lower()} version.",
                )
        if column_id is not None:
            if table_id is None:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_CONTENT,
                    f"A {label.lower()} column requires a {label.lower()} table.",
                )
            column = self.session.get(DatabaseTableColumn, column_id)
            if column is None or not column.enabled or column.database_table_id != table_id:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND,
                    f"{label} column not found in the {label.lower()} table.",
                )
        if subfield_id is None:
            return
        if column_id is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                f"A {label.lower()} sub-field requires a {label.lower()} column.",
            )
        subfield = self.session.get(DatabaseTableColumnSubfield, subfield_id)
        if (
            subfield is None
            or not subfield.enabled
            or subfield.database_table_column_id != column_id
        ):
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                f"{label} sub-field not found in the {label.lower()} column.",
            )

    def _validate_refs(
        self,
        migration: DatabaseMigration,
        *,
        source_database_table_id: uuid.UUID | None,
        source_database_table_column_id: uuid.UUID | None,
        source_database_table_column_subfield_id: uuid.UUID | None,
        destination_database_table_id: uuid.UUID | None,
        destination_database_table_column_id: uuid.UUID | None,
        destination_database_table_column_subfield_id: uuid.UUID | None,
    ) -> None:
        self._validate_side(
            table_id=source_database_table_id,
            column_id=source_database_table_column_id,
            subfield_id=source_database_table_column_subfield_id,
            database_version_id=migration.source_database_version_id,
            label="Source",
        )
        self._validate_side(
            table_id=destination_database_table_id,
            column_id=destination_database_table_column_id,
            subfield_id=destination_database_table_column_subfield_id,
            database_version_id=migration.destination_database_version_id,
            label="Destination",
        )

    def create(
        self,
        migration: DatabaseMigration,
        user: User,
        *,
        type: DatabaseMigrationColumnType,
        source_database_table_id: uuid.UUID | None,
        source_database_table_column_id: uuid.UUID | None,
        source_database_table_column_subfield_id: uuid.UUID | None,
        destination_database_table_id: uuid.UUID | None,
        destination_database_table_column_id: uuid.UUID | None,
        destination_database_table_column_subfield_id: uuid.UUID | None,
        transformation_method: str | None,
        description: dict | None,
    ) -> DatabaseMigrationColumn:
        """Create a draft column step on `migration` after validating its refs."""
        self._validate_refs(
            migration,
            source_database_table_id=source_database_table_id,
            source_database_table_column_id=source_database_table_column_id,
            source_database_table_column_subfield_id=source_database_table_column_subfield_id,
            destination_database_table_id=destination_database_table_id,
            destination_database_table_column_id=destination_database_table_column_id,
            destination_database_table_column_subfield_id=destination_database_table_column_subfield_id,
        )
        now = utc_now()
        column = DatabaseMigrationColumn(
            account_id=migration.account_id,
            database_migration_id=migration.id,
            owner_id=user.id,
            source_database_table_id=source_database_table_id,
            source_database_table_column_id=source_database_table_column_id,
            source_database_table_column_subfield_id=source_database_table_column_subfield_id,
            destination_database_table_id=destination_database_table_id,
            destination_database_table_column_id=destination_database_table_column_id,
            destination_database_table_column_subfield_id=destination_database_table_column_subfield_id,
            date=now,
            type=type,
            status=DatabaseMigrationColumnStatus.DRAFT,
            status_date=now,
            transformation_method=transformation_method,
            description=description,
        )
        return self._persist(column)

    def update(
        self, migration: DatabaseMigration, column: DatabaseMigrationColumn, fields: dict
    ) -> DatabaseMigrationColumn:
        """Apply a partial update, re-validating references when they change."""
        ref_keys = {
            "source_database_table_id",
            "source_database_table_column_id",
            "source_database_table_column_subfield_id",
            "destination_database_table_id",
            "destination_database_table_column_id",
            "destination_database_table_column_subfield_id",
        }
        if ref_keys & fields.keys():
            self._validate_refs(
                migration,
                source_database_table_id=fields.get(
                    "source_database_table_id", column.source_database_table_id
                ),
                source_database_table_column_id=fields.get(
                    "source_database_table_column_id", column.source_database_table_column_id
                ),
                source_database_table_column_subfield_id=fields.get(
                    "source_database_table_column_subfield_id",
                    column.source_database_table_column_subfield_id,
                ),
                destination_database_table_id=fields.get(
                    "destination_database_table_id", column.destination_database_table_id
                ),
                destination_database_table_column_id=fields.get(
                    "destination_database_table_column_id",
                    column.destination_database_table_column_id,
                ),
                destination_database_table_column_subfield_id=fields.get(
                    "destination_database_table_column_subfield_id",
                    column.destination_database_table_column_subfield_id,
                ),
            )
        return self.apply_update(column, fields)

    def soft_delete(self, column: DatabaseMigrationColumn) -> None:
        self._guard_unlocked(column)
        now = utc_now()
        self._disable(column, now)
        self.session.commit()
