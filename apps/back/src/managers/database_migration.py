"""Migration lifecycle: creation/update with reference validation, status, delete.

A migration is scoped to its **source** database — the one behind `{database_id}`
in the URL — so only the destination side travels in the request body. Both
versions are re-checked against the database they must belong to, and the
destination database against the account. Deleting a migration cascades to its
column steps.
"""

import uuid

from fastapi import HTTPException, status
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.database import Database
from src.models.database_migration import DatabaseMigration
from src.models.database_migration_column import DatabaseMigrationColumn
from src.models.database_version import DatabaseVersion
from src.models.enum import DatabaseMigrationStatus, DatabaseMigrationType
from src.utils.datetime import utc_now


class DatabaseMigrationManager(BaseEntityManager):
    def list_for_database(self, database: Database) -> list[DatabaseMigration]:
        """Every enabled migration leaving this database, most recent first."""
        return list(
            self.session.exec(
                select(DatabaseMigration)
                .where(
                    DatabaseMigration.source_database_id == database.id,
                    DatabaseMigration.enabled.is_(True),
                )
                .order_by(DatabaseMigration.date.desc())
            ).all()
        )

    def _load_version(self, version_id: uuid.UUID, database_id: uuid.UUID, label: str) -> None:
        version = self.session.get(DatabaseVersion, version_id)
        if version is None or not version.enabled or version.database_id != database_id:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, f"{label} version not found in the {label.lower()} database."
            )

    def _validate_refs(
        self,
        database: Database,
        *,
        source_database_version_id: uuid.UUID,
        destination_database_id: uuid.UUID,
        destination_database_version_id: uuid.UUID,
    ) -> None:
        self._load_version(source_database_version_id, database.id, "Source")

        destination = self.session.get(Database, destination_database_id)
        if (
            destination is None
            or not destination.enabled
            or destination.account_id != database.account_id
        ):
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "Destination database not found in this account."
            )
        self._load_version(destination_database_version_id, destination.id, "Destination")

    def create(
        self,
        database: Database,
        *,
        type: DatabaseMigrationType,
        title: str,
        description: dict | None,
        source_database_version_id: uuid.UUID,
        destination_database_id: uuid.UUID,
        destination_database_version_id: uuid.UUID,
    ) -> DatabaseMigration:
        """Create a draft migration leaving `database` after validating its refs."""
        self._validate_refs(
            database,
            source_database_version_id=source_database_version_id,
            destination_database_id=destination_database_id,
            destination_database_version_id=destination_database_version_id,
        )
        now = utc_now()
        migration = DatabaseMigration(
            account_id=database.account_id,
            source_database_id=database.id,
            source_database_version_id=source_database_version_id,
            destination_database_id=destination_database_id,
            destination_database_version_id=destination_database_version_id,
            date=now,
            type=type,
            status=DatabaseMigrationStatus.DRAFT,
            status_date=now,
            title=title,
            description=description,
        )
        return self._persist(migration)

    def update(
        self, database: Database, migration: DatabaseMigration, fields: dict
    ) -> DatabaseMigration:
        """Apply a partial update, re-validating references when they change."""
        ref_keys = {
            "source_database_version_id",
            "destination_database_id",
            "destination_database_version_id",
        }
        if ref_keys & fields.keys():
            self._validate_refs(
                database,
                source_database_version_id=fields.get(
                    "source_database_version_id", migration.source_database_version_id
                ),
                destination_database_id=fields.get(
                    "destination_database_id", migration.destination_database_id
                ),
                destination_database_version_id=fields.get(
                    "destination_database_version_id", migration.destination_database_version_id
                ),
            )
        return self.apply_update(migration, fields)

    def soft_delete(self, migration: DatabaseMigration) -> None:
        """Soft-delete the migration and its column steps."""
        now = utc_now()
        self._disable(migration, now)
        self._bulk_disable(
            DatabaseMigrationColumn,
            DatabaseMigrationColumn.database_migration_id == migration.id,
            now=now,
        )
        self.session.commit()
