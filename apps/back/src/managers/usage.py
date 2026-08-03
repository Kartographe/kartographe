# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Account usage: live-row counts per tracked entity, grouped by typology.

For every entity type the account owns, we count the live (`enabled`) rows
scoped to the account and compare them against a quota. File entities also sum
their `file_size` to report cumulative storage against a storage quota.

Quotas come from the account's `Entitlements` — Community's flat ceilings in
the AGPL core, the account's licence once the Enterprise Edition is installed.
This manager never learns which: it asks for a number and reports it.

`_GROUPS` is the other half of the `QuotaKey` contract: every entity counted
here has a key there, and every key there is counted here. `test_licensing.py`
asserts that both ways, so adding an entity without a quota key (or the
reverse) fails the suite rather than silently escaping its ceiling.
"""

from sqlalchemy import func
from sqlmodel import Session, select

from src.licensing import Entitlements, QuotaKey
from src.models._base import BaseModel
from src.models.account import Account
from src.models.account_user import AccountUser
from src.models.application import Application
from src.models.application_component import ApplicationComponent
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
from src.models.database_table_column_subfield import DatabaseTableColumnSubfield
from src.models.database_table_constraint import DatabaseTableConstraint
from src.models.database_table_index import DatabaseTableIndex
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

# Ordered typology → entities. Each entity: (quota key, model, is_file).
# `is_file` entities carry a `file_size` column that we sum for storage usage.
_GROUPS: list[tuple[str, list[tuple[QuotaKey, type[BaseModel], bool]]]] = [
    ("members", [(QuotaKey.ACCOUNT_USER, AccountUser, False)]),
    (
        "applications",
        [
            (QuotaKey.APPLICATION, Application, False),
            (QuotaKey.APPLICATION_VERSION, ApplicationVersion, False),
            (QuotaKey.APPLICATION_ENVIRONMENT, ApplicationEnvironment, False),
            (QuotaKey.APPLICATION_ENVIRONMENT_VERSION, ApplicationEnvironmentVersion, False),
            (QuotaKey.APPLICATION_FEATURE, ApplicationFeature, False),
            (QuotaKey.APPLICATION_GUARD, ApplicationGuard, False),
            (QuotaKey.APPLICATION_ROLE, ApplicationRole, False),
            (QuotaKey.APPLICATION_ROUTE, ApplicationRoute, False),
            (QuotaKey.APPLICATION_ROUTE_EXAMPLE, ApplicationRouteExample, False),
            (QuotaKey.APPLICATION_ROUTE_RESPONSE, ApplicationRouteResponse, False),
            (QuotaKey.APPLICATION_ROUTE_TABLE, ApplicationRouteTable, False),
            (QuotaKey.APPLICATION_COMPONENT, ApplicationComponent, False),
        ],
    ),
    (
        "databases",
        [
            (QuotaKey.DATABASE, Database, False),
            (QuotaKey.DATABASE_VERSION, DatabaseVersion, False),
            (QuotaKey.DATABASE_TABLE, DatabaseTable, False),
            (QuotaKey.DATABASE_TABLE_COLUMN, DatabaseTableColumn, False),
            (QuotaKey.DATABASE_TABLE_COLUMN_SUBFIELD, DatabaseTableColumnSubfield, False),
            (QuotaKey.DATABASE_TABLE_INDEX, DatabaseTableIndex, False),
            (QuotaKey.DATABASE_TABLE_CONSTRAINT, DatabaseTableConstraint, False),
            (QuotaKey.DATABASE_MIGRATION, DatabaseMigration, False),
            (QuotaKey.DATABASE_MIGRATION_COLUMN, DatabaseMigrationColumn, False),
        ],
    ),
    (
        "features",
        [
            (QuotaKey.FEATURE, Feature, False),
            (QuotaKey.FEATURE_FILE, FeatureFile, True),
            (QuotaKey.FEATURE_JOURNEY, FeatureJourney, False),
        ],
    ),
    (
        "journeys",
        [
            (QuotaKey.JOURNEY, Journey, False),
            (QuotaKey.JOURNEY_SCENARIO, JourneyScenario, False),
            (QuotaKey.JOURNEY_SCENARIO_STEP, JourneyScenarioStep, False),
            (QuotaKey.JOURNEY_SCENARIO_STEP_ASSERTION, JourneyScenarioStepAssertion, False),
            (QuotaKey.JOURNEY_SCENARIO_STEP_FILE, JourneyScenarioStepFile, True),
            (QuotaKey.JOURNEY_SCENARIO_STEP_ROUTE, JourneyScenarioStepRoute, False),
        ],
    ),
    ("personas", [(QuotaKey.PERSONA, Persona, False)]),
    (
        "services",
        [
            (QuotaKey.SERVICE, Service, False),
            (QuotaKey.SERVICE_ACTION, ServiceAction, False),
        ],
    ),
    (
        "content",
        [
            (QuotaKey.TAG, Tag, False),
            (QuotaKey.COMMENT, Comment, False),
        ],
    ),
]


class UsageManager:
    def __init__(self, session: Session):
        self.session = session

    def report_for_account(self, account: Account, entitlements: Entitlements) -> UsageReport:
        """Count the account's live records for every tracked entity, grouped,
        each against the ceiling `entitlements` grants it."""
        groups = [
            UsageGroup(
                key=group_key,
                entries=[
                    self._entry(account, key, model, is_file, entitlements)
                    for key, model, is_file in entities
                ],
            )
            for group_key, entities in _GROUPS
        ]
        return UsageReport(groups=groups)

    def _entry(
        self,
        account: Account,
        key: QuotaKey,
        model: type[BaseModel],
        is_file: bool,
        entitlements: Entitlements,
    ) -> UsageEntry:
        # `key.value`, not `key`: QuotaKey is a `(str, Enum)`, so passing the
        # member into a `str` field leans on subclass coercion and on Enum's
        # `__str__` never being consulted. The serializer's contract is a plain
        # string — hand it one.
        if is_file:
            count, total_size = self.session.exec(
                select(func.count(), func.coalesce(func.sum(model.file_size), 0))
                .select_from(model)
                .where(model.account_id == account.id, model.enabled.is_(True))
            ).one()
            return UsageEntry(
                key=key.value,
                count=count,
                limit=entitlements.entity_quota(key),
                total_size=total_size,
                storage_limit=entitlements.storage_quota(key),
            )
        count = self.session.exec(
            select(func.count())
            .select_from(model)
            .where(model.account_id == account.id, model.enabled.is_(True))
        ).one()
        return UsageEntry(key=key.value, count=count, limit=entitlements.entity_quota(key))
