# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""SQLModel tables.

Every persistent model must be imported here so that:
- `SQLModel.metadata` is populated for Alembic autogeneration,
- callers can do `from src.models import Foo` without wildcard imports.
"""

from src.models._base import BaseModel
from src.models.account import Account
from src.models.account_user import AccountUser
from src.models.account_user_invitation import AccountUserInvitation
from src.models.action_type import ActionType
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
from src.models.assertion_type import AssertionType
from src.models.comment import Comment
from src.models.database import Database
from src.models.database_column_type import DatabaseColumnType
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
from src.models.oauth_authorization_request import OauthAuthorizationRequest
from src.models.oauth_client import OauthClient
from src.models.oauth_grant import OauthGrant
from src.models.persona import Persona
from src.models.search import Search
from src.models.service import Service
from src.models.service_action import ServiceAction
from src.models.tag import Tag
from src.models.user import User
from src.models.user_authentication import UserAuthentication
from src.models.user_authentication_log import UserAuthenticationLog
from src.models.user_authentication_two_factor import UserAuthenticationTwoFactor
from src.models.vote import Vote

__all__ = [
    "Account",
    "AccountUser",
    "AccountUserInvitation",
    "ActionType",
    "Application",
    "ApplicationEnvironment",
    "ApplicationEnvironmentVersion",
    "ApplicationFeature",
    "ApplicationGuard",
    "ApplicationRole",
    "ApplicationRoute",
    "ApplicationRouteExample",
    "ApplicationRouteResponse",
    "ApplicationRouteTable",
    "ApplicationVersion",
    "AssertionType",
    "BaseModel",
    "Comment",
    "Database",
    "DatabaseColumnType",
    "DatabaseMigration",
    "DatabaseMigrationColumn",
    "DatabaseTable",
    "DatabaseTableColumn",
    "DatabaseVersion",
    "Feature",
    "FeatureFile",
    "FeatureJourney",
    "Journey",
    "JourneyScenario",
    "JourneyScenarioStep",
    "JourneyScenarioStepAssertion",
    "JourneyScenarioStepFile",
    "JourneyScenarioStepRoute",
    "OauthAuthorizationRequest",
    "OauthClient",
    "OauthGrant",
    "Persona",
    "Search",
    "Service",
    "ServiceAction",
    "Tag",
    "User",
    "UserAuthentication",
    "UserAuthenticationLog",
    "UserAuthenticationTwoFactor",
    "Vote",
]

# Wire the full-text index listeners once every model class is mapped, so any
# `Searchable` table auto-registers its insert/update/delete index-sync hooks.
from src.services.search_indexer import wire_search_indexers  # noqa: E402

wire_search_indexers()
