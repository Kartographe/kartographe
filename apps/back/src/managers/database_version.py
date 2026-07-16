# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Database version lifecycle.

Activating a version archives the other active version of the same database
(stamping its `end_date`) and stamps the new one's `start_date`, so a database
has at most one active version at a time. Deleting a version cascades to its
tables and their columns.
"""

from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.database import Database
from src.models.database_table import DatabaseTable
from src.models.database_table_column import DatabaseTableColumn
from src.models.database_version import DatabaseVersion
from src.models.enum import DatabaseVersionStatus
from src.utils.datetime import utc_now


class DatabaseVersionManager(BaseEntityManager):
    def list_for_database(self, database: Database) -> list[DatabaseVersion]:
        """Every enabled version of the database, most recent first."""
        return list(
            self.session.exec(
                select(DatabaseVersion)
                .where(
                    DatabaseVersion.database_id == database.id,
                    DatabaseVersion.enabled.is_(True),
                )
                .order_by(DatabaseVersion.date.desc())
            ).all()
        )

    def create(self, database: Database, *, version: list[int]) -> DatabaseVersion:
        """Create a draft version of the database."""
        database_version = DatabaseVersion(
            account_id=database.account_id,
            database_id=database.id,
            date=utc_now(),
            status=DatabaseVersionStatus.DRAFT,
            version=version,
        )
        return self._persist(database_version)

    def activate(self, database_version: DatabaseVersion) -> DatabaseVersion:
        """Make this the active version; archive the previously active one."""
        now = utc_now()
        others = self.session.exec(
            select(DatabaseVersion).where(
                DatabaseVersion.database_id == database_version.database_id,
                DatabaseVersion.id != database_version.id,
                DatabaseVersion.status == DatabaseVersionStatus.ACTIVE,
                DatabaseVersion.enabled.is_(True),
            )
        ).all()
        for other in others:
            other.status = DatabaseVersionStatus.ARCHIVED
            other.end_date = now
            other.updated_at = now
            self.session.add(other)

        database_version.status = DatabaseVersionStatus.ACTIVE
        database_version.start_date = now
        database_version.end_date = None
        database_version.updated_at = now
        return self._persist(database_version)

    def archive(self, database_version: DatabaseVersion) -> DatabaseVersion:
        """Archive the version, stamping its `end_date`."""
        now = utc_now()
        database_version.status = DatabaseVersionStatus.ARCHIVED
        database_version.end_date = now
        database_version.updated_at = now
        return self._persist(database_version)

    def soft_delete(self, database_version: DatabaseVersion) -> None:
        """Soft-delete the version with its tables and their columns."""
        now = utc_now()
        table_ids = self.session.exec(
            select(DatabaseTable.id).where(
                DatabaseTable.database_version_id == database_version.id,
                DatabaseTable.enabled.is_(True),
            )
        ).all()
        self._disable(database_version, now)
        self._bulk_disable(
            DatabaseTable, DatabaseTable.database_version_id == database_version.id, now=now
        )
        if table_ids:
            self._bulk_disable(
                DatabaseTableColumn, DatabaseTableColumn.database_table_id.in_(table_ids), now=now
            )
        self.session.commit()
