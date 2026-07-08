"""Read-only access to the global reference catalogues.

Action and assertion types are seeded by a data migration; this manager only
lists them (single lookups go through the dependency loaders).
"""

from sqlmodel import Session, select

from src.models.action_type import ActionType
from src.models.assertion_type import AssertionType


class CoreManager:
    def __init__(self, session: Session):
        self.session = session

    def list_action_types(self) -> list[ActionType]:
        """Every enabled action type, ordered by slug."""
        return list(
            self.session.exec(
                select(ActionType)
                .where(ActionType.enabled.is_(True))
                .order_by(ActionType.slug.asc())
            ).all()
        )

    def list_assertion_types(self) -> list[AssertionType]:
        """Every enabled assertion type, ordered by slug."""
        return list(
            self.session.exec(
                select(AssertionType)
                .where(AssertionType.enabled.is_(True))
                .order_by(AssertionType.slug.asc())
            ).all()
        )
