"""Step file lifecycle: upload, metadata edits, archive/restore, delete."""

from fastapi import UploadFile
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.managers.files import FileManager
from src.models.enum import JourneyScenarioStepFileStatus, JourneyScenarioStepFileType
from src.models.journey_scenario_step import JourneyScenarioStep
from src.models.journey_scenario_step_file import JourneyScenarioStepFile
from src.models.user import User
from src.utils.datetime import utc_now


class JourneyScenarioStepFileManager(BaseEntityManager):
    def __init__(self, session):
        super().__init__(session)
        self._files = FileManager()

    def list_for_step(self, step: JourneyScenarioStep) -> list[JourneyScenarioStepFile]:
        """Every enabled file of the step, most recent first."""
        return list(
            self.session.exec(
                select(JourneyScenarioStepFile)
                .where(
                    JourneyScenarioStepFile.journey_scenario_step_id == step.id,
                    JourneyScenarioStepFile.enabled.is_(True),
                )
                .order_by(JourneyScenarioStepFile.date.desc())
            ).all()
        )

    def download_url_for(self, step_file: JourneyScenarioStepFile) -> str | None:
        """Time-limited download URL for the file's binary content."""
        return self._files.download_url_for(step_file.file_path)

    def create(
        self, step: JourneyScenarioStep, user: User, file: UploadFile
    ) -> JourneyScenarioStepFile:
        """Store an uploaded file and record it against the step."""
        stored = self._files.save_upload(
            file, prefix=f"journeys/{step.journey_id}/steps/{step.id}/files"
        )
        now = utc_now()
        step_file = JourneyScenarioStepFile(
            account_id=step.account_id,
            journey_id=step.journey_id,
            journey_scenario_id=step.journey_scenario_id,
            journey_scenario_step_id=step.id,
            owner_id=user.id,
            date=now,
            type=JourneyScenarioStepFileType.OTHER,
            status=JourneyScenarioStepFileStatus.UPLOADED,
            status_date=now,
            name=stored.file_name,
            description=None,
            file_name=stored.file_name,
            file_size=stored.file_size,
            file_extension=stored.file_extension,
            file_path=stored.key,
        )
        return self._persist(step_file)

    def soft_delete(self, step_file: JourneyScenarioStepFile) -> None:
        """Soft-delete the row (the stored blob is kept for potential restore)."""
        now = utc_now()
        self._disable(step_file, now)
        self.session.commit()
