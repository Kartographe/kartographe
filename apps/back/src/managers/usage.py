"""Account usage: live-row counts per tracked entity, grouped by typology.

For every entity type the account owns, we count the live (`enabled`) rows
scoped to the account and compare them against a quota. File entities also sum
their `file_size` to report cumulative storage against a storage quota.

The quotas below are flat placeholders — the upcoming License feature will drive
`ENTITY_LIMIT` / `STORAGE_LIMIT` per account. Keeping them here (and per-entry on
the serializer) means License can override them without reshaping the contract.
"""

from sqlalchemy import func
from sqlmodel import Session, select

from src.models._base import BaseModel
from src.models.account import Account
from src.models.account_user import AccountUser
from src.models.application import Application
from src.models.application_environment import ApplicationEnvironment
from src.models.application_environment_version import ApplicationEnvironmentVersion
from src.models.application_feature import ApplicationFeature
from src.models.application_guard import ApplicationGuard
from src.models.application_role import ApplicationRole
from src.models.application_route import ApplicationRoute
from src.models.application_route_example import ApplicationRouteExample
from src.models.application_route_response import ApplicationRouteResponse
from src.models.application_route_table import ApplicationRouteTable
from src.models.application_version import ApplicationVersion
from src.models.comment import Comment
from src.models.database import Database
from src.models.database_migration import DatabaseMigration
from src.models.database_migration_column import DatabaseMigrationColumn
from src.models.database_table import DatabaseTable
from src.models.database_table_column import DatabaseTableColumn
from src.models.database_version import DatabaseVersion
from src.models.feature import Feature
from src.models.feature_file import FeatureFile
from src.models.feature_journey import FeatureJourney
from src.models.journey import Journey
from src.models.journey_scenario import JourneyScenario
from src.models.journey_scenario_step import JourneyScenarioStep
from src.models.journey_scenario_step_assertion import JourneyScenarioStepAssertion
from src.models.journey_scenario_step_file import JourneyScenarioStepFile
from src.models.journey_scenario_step_route import JourneyScenarioStepRoute
from src.models.persona import Persona
from src.models.service import Service
from src.models.service_action import ServiceAction
from src.models.tag import Tag
from src.serializes.usage import UsageEntry, UsageGroup, UsageReport

# Placeholder quotas until the License feature drives them per account.
ENTITY_LIMIT = 1000
STORAGE_LIMIT = 1024**3  # 1 GiB per file entity.

# Ordered typology → entities. Each entity: (camelCase key, model, is_file).
# `is_file` entities carry a `file_size` column that we sum for storage usage.
_GROUPS: list[tuple[str, list[tuple[str, type[BaseModel], bool]]]] = [
    ("members", [("accountUser", AccountUser, False)]),
    (
        "applications",
        [
            ("application", Application, False),
            ("applicationVersion", ApplicationVersion, False),
            ("applicationEnvironment", ApplicationEnvironment, False),
            ("applicationEnvironmentVersion", ApplicationEnvironmentVersion, False),
            ("applicationFeature", ApplicationFeature, False),
            ("applicationGuard", ApplicationGuard, False),
            ("applicationRole", ApplicationRole, False),
            ("applicationRoute", ApplicationRoute, False),
            ("applicationRouteExample", ApplicationRouteExample, False),
            ("applicationRouteResponse", ApplicationRouteResponse, False),
            ("applicationRouteTable", ApplicationRouteTable, False),
        ],
    ),
    (
        "databases",
        [
            ("database", Database, False),
            ("databaseVersion", DatabaseVersion, False),
            ("databaseTable", DatabaseTable, False),
            ("databaseTableColumn", DatabaseTableColumn, False),
            ("databaseMigration", DatabaseMigration, False),
            ("databaseMigrationColumn", DatabaseMigrationColumn, False),
        ],
    ),
    (
        "features",
        [
            ("feature", Feature, False),
            ("featureFile", FeatureFile, True),
            ("featureJourney", FeatureJourney, False),
        ],
    ),
    (
        "journeys",
        [
            ("journey", Journey, False),
            ("journeyScenario", JourneyScenario, False),
            ("journeyScenarioStep", JourneyScenarioStep, False),
            ("journeyScenarioStepAssertion", JourneyScenarioStepAssertion, False),
            ("journeyScenarioStepFile", JourneyScenarioStepFile, True),
            ("journeyScenarioStepRoute", JourneyScenarioStepRoute, False),
        ],
    ),
    ("personas", [("persona", Persona, False)]),
    (
        "services",
        [
            ("service", Service, False),
            ("serviceAction", ServiceAction, False),
        ],
    ),
    (
        "content",
        [
            ("tag", Tag, False),
            ("comment", Comment, False),
        ],
    ),
]


class UsageManager:
    def __init__(self, session: Session):
        self.session = session

    def report_for_account(self, account: Account) -> UsageReport:
        """Count the account's live records for every tracked entity, grouped."""
        groups = [
            UsageGroup(
                key=group_key,
                entries=[
                    self._entry(account, key, model, is_file)
                    for key, model, is_file in entities
                ],
            )
            for group_key, entities in _GROUPS
        ]
        return UsageReport(groups=groups)

    def _entry(
        self, account: Account, key: str, model: type[BaseModel], is_file: bool
    ) -> UsageEntry:
        if is_file:
            count, total_size = self.session.exec(
                select(func.count(), func.coalesce(func.sum(model.file_size), 0))
                .select_from(model)
                .where(model.account_id == account.id, model.enabled.is_(True))
            ).one()
            return UsageEntry(
                key=key,
                count=count,
                limit=ENTITY_LIMIT,
                total_size=total_size,
                storage_limit=STORAGE_LIMIT,
            )
        count = self.session.exec(
            select(func.count())
            .select_from(model)
            .where(model.account_id == account.id, model.enabled.is_(True))
        ).one()
        return UsageEntry(key=key, count=count, limit=ENTITY_LIMIT)
