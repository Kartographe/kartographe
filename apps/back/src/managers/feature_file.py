"""Feature file lifecycle: upload, metadata edits, archive/restore, delete.

Binary storage goes through `FileManager` (validation + backend). The stored
row keeps only the storage key (`file_path`); the download link is minted on
demand and never persisted.
"""

from fastapi import UploadFile
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.managers.files import FileManager
from src.models.enum import FeatureFileStatus, FeatureFileType
from src.models.feature import Feature
from src.models.feature_file import FeatureFile
from src.models.user import User
from src.utils.datetime import utc_now


class FeatureFileManager(BaseEntityManager):
    def __init__(self, session):
        super().__init__(session)
        self._files = FileManager()

    def list_for_feature(self, feature: Feature) -> list[FeatureFile]:
        """Every enabled file of the feature, most recent first."""
        return list(
            self.session.exec(
                select(FeatureFile)
                .where(FeatureFile.feature_id == feature.id, FeatureFile.enabled.is_(True))
                .order_by(FeatureFile.date.desc())
            ).all()
        )

    def download_url_for(self, feature_file: FeatureFile) -> str | None:
        """Time-limited download URL for the file's binary content."""
        return self._files.download_url_for(feature_file.file_path)

    def create(self, feature: Feature, user: User, file: UploadFile) -> FeatureFile:
        """Store an uploaded file and record it against the feature."""
        stored = self._files.save_upload(file, prefix=f"features/{feature.id}/files")
        now = utc_now()
        feature_file = FeatureFile(
            account_id=feature.account_id,
            feature_id=feature.id,
            owner_id=user.id,
            date=now,
            type=FeatureFileType.OTHER,
            status=FeatureFileStatus.UPLOADED,
            status_date=now,
            name=stored.file_name,
            description=None,
            file_name=stored.file_name,
            file_size=stored.file_size,
            file_extension=stored.file_extension,
            file_path=stored.key,
        )
        return self._persist(feature_file)

    def soft_delete(self, feature_file: FeatureFile) -> None:
        """Soft-delete the row (the stored blob is kept for potential restore)."""
        now = utc_now()
        self._disable(feature_file, now)
        self.session.commit()
