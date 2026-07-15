"""Value-producing FastAPI dependencies.

Everything a handler consumes as a *value* lives here (session, request IP,
current user, managers), so routes import from a single place:
`from src.utils.dependencies import CurrentUserDep, SessionDep`.

Guards that *reject* a request (raise to deny) live in `middlewares.py` instead.
"""

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from src.database import get_session
from src.managers.account import AccountManager
from src.managers.account_invitations import AccountInvitationsManager
from src.managers.account_users import AccountUsersManager
from src.managers.application import ApplicationManager
from src.managers.application_environment import ApplicationEnvironmentManager
from src.managers.application_environment_version import ApplicationEnvironmentVersionManager
from src.managers.application_feature import ApplicationFeatureManager
from src.managers.application_guard import ApplicationGuardManager
from src.managers.application_role import ApplicationRoleManager
from src.managers.application_route import ApplicationRouteManager
from src.managers.application_route_example import ApplicationRouteExampleManager
from src.managers.application_route_response import ApplicationRouteResponseManager
from src.managers.application_route_table import ApplicationRouteTableManager
from src.managers.application_version import ApplicationVersionManager
from src.managers.auth import AuthManager
from src.managers.comment import CommentManager
from src.managers.core import CoreManager
from src.managers.database import DatabaseManager
from src.managers.database_migration import DatabaseMigrationManager
from src.managers.database_migration_column import DatabaseMigrationColumnManager
from src.managers.database_table import DatabaseTableManager
from src.managers.database_table_column import DatabaseTableColumnManager
from src.managers.database_version import DatabaseVersionManager
from src.managers.feature import FeatureManager
from src.managers.feature_file import FeatureFileManager
from src.managers.feature_journey import FeatureJourneyManager
from src.managers.journey import JourneyManager
from src.managers.journey_scenario import JourneyScenarioManager
from src.managers.journey_scenario_step import JourneyScenarioStepManager
from src.managers.journey_scenario_step_assertion import JourneyScenarioStepAssertionManager
from src.managers.journey_scenario_step_file import JourneyScenarioStepFileManager
from src.managers.journey_scenario_step_route import JourneyScenarioStepRouteManager
from src.managers.persona import PersonaManager
from src.managers.service import ServiceManager
from src.managers.service_action import ServiceActionManager
from src.managers.tag import TagManager
from src.managers.usage import UsageManager
from src.managers.me import MeManager
from src.managers.me_integrations import MeIntegrationsManager
from src.managers.me_invitations import MeInvitationsManager
from src.managers.me_security import MeSecurityManager
from src.managers.oauth import OauthManager
from src.managers.token import UserTokenManager
from src.models.account import Account
from src.models.account_user import AccountUser
from src.models.account_user_invitation import AccountUserInvitation
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
from src.models.action_type import ActionType
from src.models.assertion_type import AssertionType
from src.models.comment import Comment
from src.models.database import Database
from src.models.database_column_type import DatabaseColumnType
from src.models.database_migration import DatabaseMigration
from src.models.database_migration_column import DatabaseMigrationColumn
from src.models.database_table import DatabaseTable
from src.models.database_table_column import DatabaseTableColumn
from src.models.database_version import DatabaseVersion
from src.models.enum import AccountUserRole, UserStatus
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
from src.models.oauth_authorization_request import OauthAuthorizationRequest
from src.models.oauth_grant import OauthGrant
from src.models.user import User
from src.utils.oauth_auth import OauthBearerError, load_grant_from_token

SessionDep = Annotated[Session, Depends(get_session)]


def _extract_request_ip(request: Request) -> str | None:
    """Client IP, honoring the first hop of `X-Forwarded-For` behind a proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


RequestIp = Annotated[str | None, Depends(_extract_request_ip)]


# Declaring the scheme (even with `auto_error=False`) is what makes Scalar show
# the lock icon + Bearer hint and emits `components.securitySchemes` in
# openapi.json. Rejection stays in `get_current_user` so the message is ours.
_user_bearer = HTTPBearer(
    scheme_name="UserBearer",
    bearerFormat="JWT",
    description="Access token returned by the login endpoints.",
    auto_error=False,
)


def _active_user_or_401(session: Session, user_id: uuid.UUID) -> User:
    user = session.exec(select(User).where(User.id == user_id, User.enabled.is_(True))).first()
    if user is None or user.status != UserStatus.ACTIVE:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token.")
    return user


def _load_user_from_oauth_token(request: Request, session: Session, token: str) -> User:
    # OAuth grant access tokens are only accepted on the versioned tool surface.
    if not request.url.path.startswith("/v1"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This token cannot be used here.")
    try:
        grant = load_grant_from_token(session, token, http_method=request.method)
    except OauthBearerError as error:
        raise HTTPException(
            error.status_code,
            error.error_description,
            headers={"WWW-Authenticate": error.www_authenticate()},
        ) from error
    return _active_user_or_401(session, grant.user_id)


def get_current_user(
    request: Request,
    session: SessionDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_user_bearer)],
) -> User:
    """Resolve the authenticated user from a user access token **or** an MCP
    access token (the latter only on `/v1/*`, so the same handlers serve the SPA
    and MCP agents)."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required.")

    token = credentials.credentials
    payload, _ = UserTokenManager.decode_access(token)
    if payload is None:
        # Not a user token — try an OAuth grant token.
        return _load_user_from_oauth_token(request, session, token)

    raw_id = payload.get("user", {}).get("id")
    if not raw_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token.")
    user = _active_user_or_401(session, uuid.UUID(raw_id))
    # A rotated token_control (e.g. after a password reset) invalidates every
    # token issued before the rotation.
    if payload.get("user", {}).get("tokenControl") != user.token_control:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session has expired. Please sign in again.")
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def get_auth_manager(session: SessionDep, request_ip: RequestIp) -> AuthManager:
    return AuthManager(session, request_ip)


AuthManagerDep = Annotated[AuthManager, Depends(get_auth_manager)]


def get_me_manager(session: SessionDep) -> MeManager:
    return MeManager(session)


MeManagerDep = Annotated[MeManager, Depends(get_me_manager)]


def get_me_security_manager(session: SessionDep) -> MeSecurityManager:
    return MeSecurityManager(session)


MeSecurityManagerDep = Annotated[MeSecurityManager, Depends(get_me_security_manager)]


# --- OAuth / integrations -----------------------------------------------

def get_oauth_manager(session: SessionDep) -> OauthManager:
    return OauthManager(session)


OauthManagerDep = Annotated[OauthManager, Depends(get_oauth_manager)]


def get_me_integrations_manager(session: SessionDep) -> MeIntegrationsManager:
    return MeIntegrationsManager(session)


MeIntegrationsManagerDep = Annotated[MeIntegrationsManager, Depends(get_me_integrations_manager)]


# Dedicated scheme so the MCP tool routes advertise their own Bearer in Scalar.
_oauth_bearer = HTTPBearer(
    scheme_name="OAuthBearer",
    bearerFormat="JWT",
    description="OAuth access token obtained through the OAuth flow.",
    auto_error=False,
)


def get_current_oauth_grant(
    request: Request,
    session: SessionDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_oauth_bearer)],
) -> OauthGrant:
    """Resolve the OAuth grant behind the request (used by MCP tool routes, which
    fastapi-mcp dispatches internally so the transport middleware doesn't see)."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "A bearer token is required.",
            headers={"WWW-Authenticate": 'Bearer realm="oauth"'},
        )
    try:
        return load_grant_from_token(session, credentials.credentials, http_method=request.method)
    except OauthBearerError as error:
        raise HTTPException(
            error.status_code,
            error.error_description,
            headers={"WWW-Authenticate": error.www_authenticate()},
        ) from error


CurrentOauthGrantDep = Annotated[OauthGrant, Depends(get_current_oauth_grant)]


def get_current_oauth_user(session: SessionDep, grant: CurrentOauthGrantDep) -> User:
    return _active_user_or_401(session, grant.user_id)


CurrentOauthUserDep = Annotated[User, Depends(get_current_oauth_user)]


def get_current_me_integration_authorization_request(
    request_id: uuid.UUID, session: SessionDep
) -> OauthAuthorizationRequest:
    authorization_request = session.get(OauthAuthorizationRequest, request_id)
    if authorization_request is None or not authorization_request.enabled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Authorization request not found.")
    return authorization_request


CurrentMeIntegrationAuthorizationRequestDep = Annotated[
    OauthAuthorizationRequest, Depends(get_current_me_integration_authorization_request)
]


# --- Accounts (multi-tenant) --------------------------------------------

def get_account_manager(session: SessionDep) -> AccountManager:
    return AccountManager(session)


AccountManagerDep = Annotated[AccountManager, Depends(get_account_manager)]


def get_account_users_manager(session: SessionDep) -> AccountUsersManager:
    return AccountUsersManager(session)


AccountUsersManagerDep = Annotated[AccountUsersManager, Depends(get_account_users_manager)]


def get_account_invitations_manager(session: SessionDep) -> AccountInvitationsManager:
    return AccountInvitationsManager(session)


AccountInvitationsManagerDep = Annotated[AccountInvitationsManager, Depends(get_account_invitations_manager)]


def get_me_invitations_manager(session: SessionDep) -> MeInvitationsManager:
    return MeInvitationsManager(session)


MeInvitationsManagerDep = Annotated[MeInvitationsManager, Depends(get_me_invitations_manager)]


def get_current_account(account_id: uuid.UUID, session: SessionDep) -> Account:
    """Load the account behind `{account_id}`. 404 (not 403) on a missing or
    disabled account so we don't leak which account ids exist."""
    account = session.get(Account, account_id)
    if account is None or not account.enabled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found.")
    return account


CurrentAccountDep = Annotated[Account, Depends(get_current_account)]


def get_current_account_user(
    user: CurrentUserDep, account: CurrentAccountDep, manager: AccountManagerDep
) -> AccountUser:
    """Resolve the caller's effective membership in the account. 403 if none —
    the account exists but the caller is not a member."""
    account_user = manager.resolve_account_user(user_id=user.id, account=account)
    if account_user is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not a member of this account.")
    return account_user


CurrentAccountUserDep = Annotated[AccountUser, Depends(get_current_account_user)]


def get_target_account_user(
    account_user_id: uuid.UUID, account: CurrentAccountDep, session: SessionDep
) -> AccountUser:
    """Load a member seat by `{account_user_id}`, scoped to the account. Lighter
    filter than the caller's own membership (no status/time-window) so admins can
    act on disabled seats. 404 if it doesn't belong to the account."""
    account_user = session.get(AccountUser, account_user_id)
    if account_user is None or not account_user.enabled or account_user.account_id != account.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found.")
    return account_user


TargetAccountUserDep = Annotated[AccountUser, Depends(get_target_account_user)]


def get_current_account_invitation(
    invitation_id: uuid.UUID, account: CurrentAccountDep, session: SessionDep
) -> AccountUserInvitation:
    """Load an invitation by `{invitation_id}`, scoped to the account. 404 if it
    doesn't belong to the account."""
    invitation = session.get(AccountUserInvitation, invitation_id)
    if invitation is None or not invitation.enabled or invitation.account_id != account.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation not found.")
    return invitation


CurrentAccountInvitationDep = Annotated[AccountUserInvitation, Depends(get_current_account_invitation)]


# --- Applications & features --------------------------------------------
#
# Every loader below re-checks the object is bound to the account (or parent
# resource) behind the URL — a 404 (never a 403) so ids from other accounts
# don't leak. Membership/role is enforced separately on each route
# (`CurrentAccountUserDep` for reads, `require_role(...)` for writes).

def get_application_manager(session: SessionDep) -> ApplicationManager:
    return ApplicationManager(session)


ApplicationManagerDep = Annotated[ApplicationManager, Depends(get_application_manager)]


def get_application_environment_manager(session: SessionDep) -> ApplicationEnvironmentManager:
    return ApplicationEnvironmentManager(session)


ApplicationEnvironmentManagerDep = Annotated[
    ApplicationEnvironmentManager, Depends(get_application_environment_manager)
]


def get_application_version_manager(session: SessionDep) -> ApplicationVersionManager:
    return ApplicationVersionManager(session)


ApplicationVersionManagerDep = Annotated[
    ApplicationVersionManager, Depends(get_application_version_manager)
]


def get_application_environment_version_manager(
    session: SessionDep,
) -> ApplicationEnvironmentVersionManager:
    return ApplicationEnvironmentVersionManager(session)


ApplicationEnvironmentVersionManagerDep = Annotated[
    ApplicationEnvironmentVersionManager, Depends(get_application_environment_version_manager)
]


def get_application_feature_manager(session: SessionDep) -> ApplicationFeatureManager:
    return ApplicationFeatureManager(session)


ApplicationFeatureManagerDep = Annotated[
    ApplicationFeatureManager, Depends(get_application_feature_manager)
]


def get_feature_manager(session: SessionDep) -> FeatureManager:
    return FeatureManager(session)


FeatureManagerDep = Annotated[FeatureManager, Depends(get_feature_manager)]


def get_feature_file_manager(session: SessionDep) -> FeatureFileManager:
    return FeatureFileManager(session)


FeatureFileManagerDep = Annotated[FeatureFileManager, Depends(get_feature_file_manager)]


def get_current_application(
    application_id: uuid.UUID, account: CurrentAccountDep, session: SessionDep
) -> Application:
    application = session.get(Application, application_id)
    if application is None or not application.enabled or application.account_id != account.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found.")
    return application


CurrentApplicationDep = Annotated[Application, Depends(get_current_application)]


def get_current_application_environment(
    environment_id: uuid.UUID, application: CurrentApplicationDep, session: SessionDep
) -> ApplicationEnvironment:
    environment = session.get(ApplicationEnvironment, environment_id)
    if environment is None or not environment.enabled or environment.application_id != application.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Environment not found.")
    return environment


CurrentApplicationEnvironmentDep = Annotated[
    ApplicationEnvironment, Depends(get_current_application_environment)
]


def get_current_application_version(
    version_id: uuid.UUID, application: CurrentApplicationDep, session: SessionDep
) -> ApplicationVersion:
    version = session.get(ApplicationVersion, version_id)
    if version is None or not version.enabled or version.application_id != application.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found.")
    return version


CurrentApplicationVersionDep = Annotated[ApplicationVersion, Depends(get_current_application_version)]


def get_current_application_environment_version(
    environment_version_id: uuid.UUID,
    environment: CurrentApplicationEnvironmentDep,
    session: SessionDep,
) -> ApplicationEnvironmentVersion:
    deployment = session.get(ApplicationEnvironmentVersion, environment_version_id)
    if (
        deployment is None
        or not deployment.enabled
        or deployment.application_environment_id != environment.id
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Deployment not found.")
    return deployment


CurrentApplicationEnvironmentVersionDep = Annotated[
    ApplicationEnvironmentVersion, Depends(get_current_application_environment_version)
]


def get_current_application_feature(
    application_feature_id: uuid.UUID, application: CurrentApplicationDep, session: SessionDep
) -> ApplicationFeature:
    link = session.get(ApplicationFeature, application_feature_id)
    if link is None or not link.enabled or link.application_id != application.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application feature not found.")
    return link


CurrentApplicationFeatureDep = Annotated[
    ApplicationFeature, Depends(get_current_application_feature)
]


# --- Application guards, roles & routes ---------------------------------

def get_application_guard_manager(session: SessionDep) -> ApplicationGuardManager:
    return ApplicationGuardManager(session)


ApplicationGuardManagerDep = Annotated[ApplicationGuardManager, Depends(get_application_guard_manager)]


def get_application_role_manager(session: SessionDep) -> ApplicationRoleManager:
    return ApplicationRoleManager(session)


ApplicationRoleManagerDep = Annotated[ApplicationRoleManager, Depends(get_application_role_manager)]


def get_application_route_manager(session: SessionDep) -> ApplicationRouteManager:
    return ApplicationRouteManager(session)


ApplicationRouteManagerDep = Annotated[ApplicationRouteManager, Depends(get_application_route_manager)]


def get_application_route_response_manager(session: SessionDep) -> ApplicationRouteResponseManager:
    return ApplicationRouteResponseManager(session)


ApplicationRouteResponseManagerDep = Annotated[
    ApplicationRouteResponseManager, Depends(get_application_route_response_manager)
]


def get_application_route_example_manager(session: SessionDep) -> ApplicationRouteExampleManager:
    return ApplicationRouteExampleManager(session)


ApplicationRouteExampleManagerDep = Annotated[
    ApplicationRouteExampleManager, Depends(get_application_route_example_manager)
]


def get_application_route_table_manager(session: SessionDep) -> ApplicationRouteTableManager:
    return ApplicationRouteTableManager(session)


ApplicationRouteTableManagerDep = Annotated[
    ApplicationRouteTableManager, Depends(get_application_route_table_manager)
]


def get_current_application_guard(
    guard_id: uuid.UUID, application: CurrentApplicationDep, session: SessionDep
) -> ApplicationGuard:
    guard = session.get(ApplicationGuard, guard_id)
    if guard is None or not guard.enabled or guard.application_id != application.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Guard not found.")
    return guard


CurrentApplicationGuardDep = Annotated[ApplicationGuard, Depends(get_current_application_guard)]


def get_current_application_role(
    role_id: uuid.UUID, application: CurrentApplicationDep, session: SessionDep
) -> ApplicationRole:
    role = session.get(ApplicationRole, role_id)
    if role is None or not role.enabled or role.application_id != application.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Role not found.")
    return role


CurrentApplicationRoleDep = Annotated[ApplicationRole, Depends(get_current_application_role)]


def get_current_application_route(
    route_id: uuid.UUID, application: CurrentApplicationDep, session: SessionDep
) -> ApplicationRoute:
    route = session.get(ApplicationRoute, route_id)
    if route is None or not route.enabled or route.application_id != application.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Route not found.")
    return route


CurrentApplicationRouteDep = Annotated[ApplicationRoute, Depends(get_current_application_route)]


def get_current_application_route_response(
    response_id: uuid.UUID, route: CurrentApplicationRouteDep, session: SessionDep
) -> ApplicationRouteResponse:
    response = session.get(ApplicationRouteResponse, response_id)
    if response is None or not response.enabled or response.application_route_id != route.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Response not found.")
    return response


CurrentApplicationRouteResponseDep = Annotated[
    ApplicationRouteResponse, Depends(get_current_application_route_response)
]


def get_current_application_route_example(
    example_id: uuid.UUID, route: CurrentApplicationRouteDep, session: SessionDep
) -> ApplicationRouteExample:
    example = session.get(ApplicationRouteExample, example_id)
    if example is None or not example.enabled or example.application_route_id != route.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Example not found.")
    return example


CurrentApplicationRouteExampleDep = Annotated[
    ApplicationRouteExample, Depends(get_current_application_route_example)
]


def get_current_application_route_table(
    route_table_id: uuid.UUID, route: CurrentApplicationRouteDep, session: SessionDep
) -> ApplicationRouteTable:
    link = session.get(ApplicationRouteTable, route_table_id)
    if link is None or not link.enabled or link.application_route_id != route.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Route table not found.")
    return link


CurrentApplicationRouteTableDep = Annotated[
    ApplicationRouteTable, Depends(get_current_application_route_table)
]


def get_current_feature(
    feature_id: uuid.UUID, account: CurrentAccountDep, session: SessionDep
) -> Feature:
    feature = session.get(Feature, feature_id)
    if feature is None or not feature.enabled or feature.account_id != account.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Feature not found.")
    return feature


CurrentFeatureDep = Annotated[Feature, Depends(get_current_feature)]


def get_current_feature_file(
    feature_file_id: uuid.UUID, feature: CurrentFeatureDep, session: SessionDep
) -> FeatureFile:
    feature_file = session.get(FeatureFile, feature_file_id)
    if feature_file is None or not feature_file.enabled or feature_file.feature_id != feature.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found.")
    return feature_file


CurrentFeatureFileDep = Annotated[FeatureFile, Depends(get_current_feature_file)]


# --- Core reference catalogues (global, read-only) ----------------------

def get_core_manager(session: SessionDep) -> CoreManager:
    return CoreManager(session)


CoreManagerDep = Annotated[CoreManager, Depends(get_core_manager)]


def get_current_action_type(action_type_id: uuid.UUID, session: SessionDep) -> ActionType:
    action_type = session.get(ActionType, action_type_id)
    if action_type is None or not action_type.enabled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Action type not found.")
    return action_type


CurrentActionTypeDep = Annotated[ActionType, Depends(get_current_action_type)]


def get_current_assertion_type(assertion_type_id: uuid.UUID, session: SessionDep) -> AssertionType:
    assertion_type = session.get(AssertionType, assertion_type_id)
    if assertion_type is None or not assertion_type.enabled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assertion type not found.")
    return assertion_type


CurrentAssertionTypeDep = Annotated[AssertionType, Depends(get_current_assertion_type)]


def get_current_database_column_type(
    database_column_type_id: uuid.UUID, session: SessionDep
) -> DatabaseColumnType:
    column_type = session.get(DatabaseColumnType, database_column_type_id)
    if column_type is None or not column_type.enabled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Column type not found.")
    return column_type


CurrentDatabaseColumnTypeDep = Annotated[
    DatabaseColumnType, Depends(get_current_database_column_type)
]


# --- Databases ----------------------------------------------------------

def get_database_manager(session: SessionDep) -> DatabaseManager:
    return DatabaseManager(session)


DatabaseManagerDep = Annotated[DatabaseManager, Depends(get_database_manager)]


def get_database_version_manager(session: SessionDep) -> DatabaseVersionManager:
    return DatabaseVersionManager(session)


DatabaseVersionManagerDep = Annotated[DatabaseVersionManager, Depends(get_database_version_manager)]


def get_database_table_manager(session: SessionDep) -> DatabaseTableManager:
    return DatabaseTableManager(session)


DatabaseTableManagerDep = Annotated[DatabaseTableManager, Depends(get_database_table_manager)]


def get_database_table_column_manager(session: SessionDep) -> DatabaseTableColumnManager:
    return DatabaseTableColumnManager(session)


DatabaseTableColumnManagerDep = Annotated[
    DatabaseTableColumnManager, Depends(get_database_table_column_manager)
]


def get_current_database(
    database_id: uuid.UUID, account: CurrentAccountDep, session: SessionDep
) -> Database:
    database = session.get(Database, database_id)
    if database is None or not database.enabled or database.account_id != account.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Database not found.")
    return database


CurrentDatabaseDep = Annotated[Database, Depends(get_current_database)]


def get_current_database_version(
    database_version_id: uuid.UUID, database: CurrentDatabaseDep, session: SessionDep
) -> DatabaseVersion:
    version = session.get(DatabaseVersion, database_version_id)
    if version is None or not version.enabled or version.database_id != database.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found.")
    return version


CurrentDatabaseVersionDep = Annotated[DatabaseVersion, Depends(get_current_database_version)]


def get_current_database_table(
    database_table_id: uuid.UUID, version: CurrentDatabaseVersionDep, session: SessionDep
) -> DatabaseTable:
    table = session.get(DatabaseTable, database_table_id)
    if table is None or not table.enabled or table.database_version_id != version.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Table not found.")
    return table


CurrentDatabaseTableDep = Annotated[DatabaseTable, Depends(get_current_database_table)]


def get_current_database_table_column(
    database_table_column_id: uuid.UUID, table: CurrentDatabaseTableDep, session: SessionDep
) -> DatabaseTableColumn:
    column = session.get(DatabaseTableColumn, database_table_column_id)
    if column is None or not column.enabled or column.database_table_id != table.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Column not found.")
    return column


CurrentDatabaseTableColumnDep = Annotated[
    DatabaseTableColumn, Depends(get_current_database_table_column)
]


def get_database_migration_manager(session: SessionDep) -> DatabaseMigrationManager:
    return DatabaseMigrationManager(session)


DatabaseMigrationManagerDep = Annotated[
    DatabaseMigrationManager, Depends(get_database_migration_manager)
]


def get_database_migration_column_manager(session: SessionDep) -> DatabaseMigrationColumnManager:
    return DatabaseMigrationColumnManager(session)


DatabaseMigrationColumnManagerDep = Annotated[
    DatabaseMigrationColumnManager, Depends(get_database_migration_column_manager)
]


def get_current_database_migration(
    database_migration_id: uuid.UUID, database: CurrentDatabaseDep, session: SessionDep
) -> DatabaseMigration:
    """A migration is reachable through the database it leaves from."""
    migration = session.get(DatabaseMigration, database_migration_id)
    if migration is None or not migration.enabled or migration.source_database_id != database.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Migration not found.")
    return migration


CurrentDatabaseMigrationDep = Annotated[DatabaseMigration, Depends(get_current_database_migration)]


def get_current_database_migration_column(
    database_migration_column_id: uuid.UUID,
    migration: CurrentDatabaseMigrationDep,
    session: SessionDep,
) -> DatabaseMigrationColumn:
    column = session.get(DatabaseMigrationColumn, database_migration_column_id)
    if column is None or not column.enabled or column.database_migration_id != migration.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Migration column not found.")
    return column


CurrentDatabaseMigrationColumnDep = Annotated[
    DatabaseMigrationColumn, Depends(get_current_database_migration_column)
]


# --- Personas & journeys ------------------------------------------------
#
# Same rule as applications/features: every loader re-checks the object against
# the account (and parent resource) behind the URL; 404 (never 403) on a miss.

def get_persona_manager(session: SessionDep) -> PersonaManager:
    return PersonaManager(session)


PersonaManagerDep = Annotated[PersonaManager, Depends(get_persona_manager)]


def get_journey_manager(session: SessionDep) -> JourneyManager:
    return JourneyManager(session)


JourneyManagerDep = Annotated[JourneyManager, Depends(get_journey_manager)]


def get_journey_scenario_manager(session: SessionDep) -> JourneyScenarioManager:
    return JourneyScenarioManager(session)


JourneyScenarioManagerDep = Annotated[JourneyScenarioManager, Depends(get_journey_scenario_manager)]


def get_journey_scenario_step_manager(session: SessionDep) -> JourneyScenarioStepManager:
    return JourneyScenarioStepManager(session)


JourneyScenarioStepManagerDep = Annotated[
    JourneyScenarioStepManager, Depends(get_journey_scenario_step_manager)
]


def get_journey_scenario_step_file_manager(session: SessionDep) -> JourneyScenarioStepFileManager:
    return JourneyScenarioStepFileManager(session)


JourneyScenarioStepFileManagerDep = Annotated[
    JourneyScenarioStepFileManager, Depends(get_journey_scenario_step_file_manager)
]


def get_journey_scenario_step_assertion_manager(
    session: SessionDep,
) -> JourneyScenarioStepAssertionManager:
    return JourneyScenarioStepAssertionManager(session)


JourneyScenarioStepAssertionManagerDep = Annotated[
    JourneyScenarioStepAssertionManager, Depends(get_journey_scenario_step_assertion_manager)
]


def get_feature_journey_manager(session: SessionDep) -> FeatureJourneyManager:
    return FeatureJourneyManager(session)


FeatureJourneyManagerDep = Annotated[FeatureJourneyManager, Depends(get_feature_journey_manager)]


def get_current_persona(
    persona_id: uuid.UUID, account: CurrentAccountDep, session: SessionDep
) -> Persona:
    persona = session.get(Persona, persona_id)
    if persona is None or not persona.enabled or persona.account_id != account.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Persona not found.")
    return persona


CurrentPersonaDep = Annotated[Persona, Depends(get_current_persona)]


def get_current_journey(
    journey_id: uuid.UUID, account: CurrentAccountDep, session: SessionDep
) -> Journey:
    journey = session.get(Journey, journey_id)
    if journey is None or not journey.enabled or journey.account_id != account.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Journey not found.")
    return journey


CurrentJourneyDep = Annotated[Journey, Depends(get_current_journey)]


def get_current_journey_scenario(
    scenario_id: uuid.UUID, journey: CurrentJourneyDep, session: SessionDep
) -> JourneyScenario:
    scenario = session.get(JourneyScenario, scenario_id)
    if scenario is None or not scenario.enabled or scenario.journey_id != journey.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scenario not found.")
    return scenario


CurrentJourneyScenarioDep = Annotated[JourneyScenario, Depends(get_current_journey_scenario)]


def get_current_journey_scenario_step(
    step_id: uuid.UUID, scenario: CurrentJourneyScenarioDep, session: SessionDep
) -> JourneyScenarioStep:
    step = session.get(JourneyScenarioStep, step_id)
    if step is None or not step.enabled or step.journey_scenario_id != scenario.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Step not found.")
    return step


CurrentJourneyScenarioStepDep = Annotated[
    JourneyScenarioStep, Depends(get_current_journey_scenario_step)
]


def get_current_journey_scenario_step_file(
    step_file_id: uuid.UUID, step: CurrentJourneyScenarioStepDep, session: SessionDep
) -> JourneyScenarioStepFile:
    step_file = session.get(JourneyScenarioStepFile, step_file_id)
    if step_file is None or not step_file.enabled or step_file.journey_scenario_step_id != step.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found.")
    return step_file


CurrentJourneyScenarioStepFileDep = Annotated[
    JourneyScenarioStepFile, Depends(get_current_journey_scenario_step_file)
]


def get_current_journey_scenario_step_assertion(
    assertion_id: uuid.UUID, step: CurrentJourneyScenarioStepDep, session: SessionDep
) -> JourneyScenarioStepAssertion:
    assertion = session.get(JourneyScenarioStepAssertion, assertion_id)
    if (
        assertion is None
        or not assertion.enabled
        or assertion.journey_scenario_step_id != step.id
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assertion not found.")
    return assertion


CurrentJourneyScenarioStepAssertionDep = Annotated[
    JourneyScenarioStepAssertion, Depends(get_current_journey_scenario_step_assertion)
]


def get_current_feature_journey(
    feature_journey_id: uuid.UUID, feature: CurrentFeatureDep, session: SessionDep
) -> FeatureJourney:
    link = session.get(FeatureJourney, feature_journey_id)
    if link is None or not link.enabled or link.feature_id != feature.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Feature journey not found.")
    return link


CurrentFeatureJourneyDep = Annotated[FeatureJourney, Depends(get_current_feature_journey)]


def get_journey_scenario_step_route_manager(
    session: SessionDep,
) -> JourneyScenarioStepRouteManager:
    return JourneyScenarioStepRouteManager(session)


JourneyScenarioStepRouteManagerDep = Annotated[
    JourneyScenarioStepRouteManager, Depends(get_journey_scenario_step_route_manager)
]


def get_current_journey_scenario_step_route(
    step_route_id: uuid.UUID, step: CurrentJourneyScenarioStepDep, session: SessionDep
) -> JourneyScenarioStepRoute:
    link = session.get(JourneyScenarioStepRoute, step_route_id)
    if link is None or not link.enabled or link.journey_scenario_step_id != step.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Step route not found.")
    return link


CurrentJourneyScenarioStepRouteDep = Annotated[
    JourneyScenarioStepRoute, Depends(get_current_journey_scenario_step_route)
]


# --- Usage --------------------------------------------------------------

def get_usage_manager(session: SessionDep) -> UsageManager:
    return UsageManager(session)


UsageManagerDep = Annotated[UsageManager, Depends(get_usage_manager)]


# --- Tags ---------------------------------------------------------------

def get_tag_manager(session: SessionDep) -> TagManager:
    return TagManager(session)


TagManagerDep = Annotated[TagManager, Depends(get_tag_manager)]


def get_current_tag(tag_id: uuid.UUID, account: CurrentAccountDep, session: SessionDep) -> Tag:
    tag = session.get(Tag, tag_id)
    if tag is None or not tag.enabled or tag.account_id != account.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tag not found.")
    return tag


CurrentTagDep = Annotated[Tag, Depends(get_current_tag)]


# --- Services -----------------------------------------------------------

def get_service_manager(session: SessionDep) -> ServiceManager:
    return ServiceManager(session)


ServiceManagerDep = Annotated[ServiceManager, Depends(get_service_manager)]


def get_service_action_manager(session: SessionDep) -> ServiceActionManager:
    return ServiceActionManager(session)


ServiceActionManagerDep = Annotated[ServiceActionManager, Depends(get_service_action_manager)]


def get_current_service(
    service_id: uuid.UUID, account: CurrentAccountDep, session: SessionDep
) -> Service:
    service = session.get(Service, service_id)
    if service is None or not service.enabled or service.account_id != account.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Service not found.")
    return service


CurrentServiceDep = Annotated[Service, Depends(get_current_service)]


def get_current_service_action(
    action_id: uuid.UUID, service: CurrentServiceDep, session: SessionDep
) -> ServiceAction:
    action = session.get(ServiceAction, action_id)
    if action is None or not action.enabled or action.service_id != service.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Service action not found.")
    return action


CurrentServiceActionDep = Annotated[ServiceAction, Depends(get_current_service_action)]


# --- Comments -----------------------------------------------------------

def get_comment_manager(session: SessionDep) -> CommentManager:
    return CommentManager(session)


CommentManagerDep = Annotated[CommentManager, Depends(get_comment_manager)]

# Roles that may moderate any comment (beyond its own author).
_COMMENT_MODERATOR_ROLES = frozenset({AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR})


def get_current_comment(
    comment_id: uuid.UUID, account: CurrentAccountDep, session: SessionDep
) -> Comment:
    comment = session.get(Comment, comment_id)
    if comment is None or not comment.enabled or comment.account_id != account.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found.")
    return comment


CurrentCommentDep = Annotated[Comment, Depends(get_current_comment)]


def get_modifiable_comment(
    comment: CurrentCommentDep, user: CurrentUserDep, membership: CurrentAccountUserDep
) -> Comment:
    """Allow the comment's author, or an owner/administrator, to modify it."""
    if comment.owner_id != user.id and membership.role not in _COMMENT_MODERATOR_ROLES:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "You can only modify your own comments."
        )
    return comment


ModifiableCommentDep = Annotated[Comment, Depends(get_modifiable_comment)]
