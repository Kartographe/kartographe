"""Tag lifecycle: listing, creation, update and delete.

Deleting a tag also removes its id from the `tag_ids` array of the entity table
its `entity_type` targets, so no entity keeps a dangling reference.
"""

from sqlalchemy import func, update
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.account import Account
from src.models.application import Application
from src.models.application_guard import ApplicationGuard
from src.models.application_route import ApplicationRoute
from src.models.database import Database
from src.models.database_table import DatabaseTable
from src.models.enum import TagEntityType
from src.models.feature import Feature
from src.models.journey import Journey
from src.models.journey_scenario import JourneyScenario
from src.models.journey_scenario_step import JourneyScenarioStep
from src.models.persona import Persona
from src.models.tag import Tag
from src.utils.datetime import utc_now

# Which entity table (and its `tag_ids` column) each tag type targets.
_TAGGED_MODEL = {
    TagEntityType.APPLICATION: Application,
    TagEntityType.APPLICATION_ROUTE: ApplicationRoute,
    TagEntityType.APPLICATION_GUARD: ApplicationGuard,
    TagEntityType.FEATURE: Feature,
    TagEntityType.JOURNEY: Journey,
    TagEntityType.JOURNEY_SCENARIO: JourneyScenario,
    TagEntityType.JOURNEY_SCENARIO_STEP: JourneyScenarioStep,
    TagEntityType.PERSONA: Persona,
    TagEntityType.DATABASE: Database,
    TagEntityType.DATABASE_TABLE: DatabaseTable,
}


class TagManager(BaseEntityManager):
    def list_for_account(
        self, account: Account, *, entity_type: TagEntityType | None = None
    ) -> list[Tag]:
        """Every enabled tag of the account, optionally filtered by entity type."""
        conditions = [Tag.account_id == account.id, Tag.enabled.is_(True)]
        if entity_type is not None:
            conditions.append(Tag.entity_type == entity_type)
        return list(
            self.session.exec(select(Tag).where(*conditions).order_by(Tag.label.asc())).all()
        )

    def create(
        self,
        account: Account,
        *,
        entity_type: TagEntityType,
        label: str,
        background_color: str,
        text_color: str,
    ) -> Tag:
        """Create a tag for `entity_type`."""
        tag = Tag(
            account_id=account.id,
            entity_type=entity_type,
            label=label,
            background_color=background_color,
            text_color=text_color,
        )
        return self._persist(tag)

    def soft_delete(self, tag: Tag) -> None:
        """Soft-delete the tag and detach it from every entity that carried it."""
        now = utc_now()
        self._disable(tag, now)
        model = _TAGGED_MODEL[tag.entity_type]
        self.session.execute(
            update(model)
            .where(
                model.account_id == tag.account_id,
                func.array_position(model.tag_ids, tag.id).isnot(None),
            )
            .values(tag_ids=func.array_remove(model.tag_ids, tag.id), updated_at=now)
        )
        self.session.commit()
