# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Enumerations shared across the persistence layer.

Every enum is a `str`-backed `Enum` so SQLModel/SQLAlchemy persists the **value**
(e.g. `"email_password"`) rather than the member name, and Pydantic serializes
the value directly into JSON. Kept in one module so models and serializers share
a single source of truth.
"""

from enum import Enum


class Language(str, Enum):
    """User interface / communication language (BCP 47 tags)."""

    FRENCH = "fr-FR"
    ENGLISH = "en-GB"
    SPANISH = "es-ES"
    GERMAN = "de-DE"
    ITALIAN = "it-IT"


class UserGender(str, Enum):
    UNKNOWN = "unknown"
    MALE = "male"
    FEMALE = "female"


class UserType(str, Enum):
    """Whether the account is operated by a human or by a machine/integration."""

    PHYSICAL = "physical"
    APPLICATION = "application"


class UserStatus(str, Enum):
    ACTIVE = "active"
    REMOVED = "removed"
    BLOCKED = "blocked"


class UserTheme(str, Enum):
    SYSTEM = "system"
    LIGHT = "light"
    DARK = "dark"


class UserAuthenticationType(str, Enum):
    """How a user proves identity for a given credential row."""

    EMAIL_PASSWORD = "email_password"
    GOOGLE_OAUTH = "google_oauth"


class UserAuthenticationStatus(str, Enum):
    NOT_VERIFIED = "not_verified"
    ACTIVE = "active"
    BLOCKED = "blocked"


class UserAuthenticationTwoFactorType(str, Enum):
    OTP = "otp"
    RECOVERY_CODE = "recovery_code"
    U2F = "u2f"


class UserAuthenticationTwoFactorStatus(str, Enum):
    NOT_VERIFIED = "not_verified"
    ACTIVE = "active"
    USED = "used"
    DISABLED = "disabled"
    BLOCKED = "blocked"


class UserAuthenticationLogType(str, Enum):
    """The auth event a log row records."""

    REGISTER = "register"
    ACTIVATE = "activate"
    ACTIVATION_LINK = "activation_link"
    EMAIL_PASSWORD = "email_password"
    GOOGLE_OAUTH = "google_oauth"
    TWO_FACTOR_OTP = "two_factor_otp"
    TWO_FACTOR_U2F = "two_factor_u2f"
    TWO_FACTOR_RECOVERY_CODE = "two_factor_recovery_code"
    REFRESH_TOKEN = "refresh_token"
    FORGOT_PASSWORD = "forgot_password"
    RESET_PASSWORD = "reset_password"
    ACCESS = "access"


class UserAuthenticationLogStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    FORBIDDEN = "forbidden"


class OauthGrantScope(str, Enum):
    """OAuth scope requested by / granted to a connected integration."""

    READ = "read"
    WRITE = "write"


class OauthGrantStatus(str, Enum):
    ACTIVE = "active"
    REVOKED = "revoked"


class OauthAuthorizationFlowType(str, Enum):
    DEVICE = "device"
    AUTHORIZATION_CODE = "authorization_code"


class OauthAuthorizationRequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    EXPIRED = "expired"
    CONSUMED = "consumed"


class AccountStatus(str, Enum):
    """Lifecycle of an account (workspace)."""

    ACTIVE = "active"
    DISABLED = "disabled"
    BLOCKED = "blocked"


class AccountUserRole(str, Enum):
    """Role a member holds inside an account.

    Drives authorization: `owner`/`administrator` are the privileged roles that
    may manage members, invitations and account settings. The same set is used
    for invitation roles (you invite someone *as* one of these roles). Only an
    `owner` may grant the `owner` role, and an account must always keep at least
    one active `owner`.
    """

    OWNER = "owner"
    ADMINISTRATOR = "administrator"
    PRODUCT_OWNER = "product_owner"
    QA_MANAGER = "qa_manager"
    LEAD_DEVELOPER = "lead_developer"
    DEVELOPER = "developer"
    DATA_ANALYST = "data_analyst"
    COMMENTATOR = "commentator"


class AccountUserType(str, Enum):
    """How a membership came to be: the account creator vs. an invited guest."""

    CREATOR = "creator"
    GUEST = "guest"


class AccountUserStatus(str, Enum):
    """Membership state — `disabled` seats stay for audit (soft-left)."""

    ACTIVE = "active"
    DISABLED = "disabled"


class AccountUserInvitationType(str, Enum):
    SIMPLE = "simple"


class AccountUserInvitationStatus(str, Enum):
    """Lifecycle of a pending seat invitation."""

    STANDBY = "standby"
    ACCEPTED = "accepted"
    REFUSED = "refused"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class ApplicationType(str, Enum):
    BACKOFFICE = "backoffice"
    CUSTOMER = "customer"
    PUBLIC = "public"
    MIXED = "mixed"
    OTHER = "other"


class ApplicationStatus(str, Enum):
    """Shared draft→active→archived lifecycle for applications, their
    environments and their versions."""

    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ApplicationEnvironmentType(str, Enum):
    PRODUCTION = "production"
    PRE_PRODUCTION = "pre-production"
    TEST = "test"
    FEATURES = "features"
    HOTFIX = "hotfix"
    OTHER = "other"


class ApplicationVersionType(str, Enum):
    ALPHA = "alpha"
    BETA = "beta"
    STABLE = "stable"
    DEV = "dev"


class ApplicationEnvironmentVersionStatus(str, Enum):
    """Deployment state of a version on an environment."""

    STANDBY = "standby"
    FINISHED = "finished"
    ERROR = "error"
    CANCELLED = "cancelled"


class FeatureType(str, Enum):
    TECHNICAL = "technical"
    PRODUCT = "product"
    QA = "qa"
    DATA = "data"
    OPS = "ops"
    IT = "it"
    OTHER = "other"


class FeatureStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class FeatureFileType(str, Enum):
    SCREENSHOT = "screenshot"
    VIDEO = "video"
    DOCUMENT = "document"
    OTHER = "other"


class FeatureFileStatus(str, Enum):
    UPLOADED = "uploaded"
    ARCHIVED = "archived"


class PersonaType(str, Enum):
    CUSTOMER = "customer"
    BUSINESS = "business"
    INTERNAL = "internal"
    OTHER = "other"


class PersonaStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ActionTypeCategory(str, Enum):
    """Family of a step action."""

    NAVIGATE = "navigate"
    FORM = "form"
    ASSERT = "assert"


class AssertionTypeCategory(str, Enum):
    """Family of a step assertion."""

    BROWSER = "browser"
    DATABASE = "database"


class JourneyType(str, Enum):
    BUSINESS = "business"
    CUSTOMER = "customer"
    INTERNAL = "internal"
    OTHER = "other"


class JourneyStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class JourneyScenarioType(str, Enum):
    NOMINAL = "nominal"
    ALTERNATIVE = "alternative"
    ERROR = "error"
    EDGE_CASE = "edge_case"


class JourneyScenarioStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class JourneyScenarioCriticity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class JourneyScenarioStepFileType(str, Enum):
    SCREENSHOT = "screenshot"
    VIDEO = "video"
    DOCUMENT = "document"
    INPUT = "input"
    OTHER = "other"


class JourneyScenarioStepFileStatus(str, Enum):
    UPLOADED = "uploaded"
    ARCHIVED = "archived"


class JourneyScenarioStepAssertionStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class DatabaseType(str, Enum):
    """Database engine — shared by the column-type catalogue and databases."""

    MYSQL = "mysql"
    POSTGRESQL = "postgresql"


class DatabaseStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class DatabaseVersionStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class DatabaseMigrationType(str, Enum):
    """Scale of a migration between two database versions."""

    MINOR = "minor"
    MAJOR = "major"


class DatabaseMigrationStatus(str, Enum):
    DRAFT = "draft"
    VALIDATED = "validated"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class DatabaseMigrationColumnType(str, Enum):
    """What happens to the column across the migration."""

    MIGRATION = "migration"
    DELETION = "deletion"
    CREATION = "creation"


class DatabaseMigrationColumnStatus(str, Enum):
    DRAFT = "draft"
    TO_BE_CONFIRMED = "to_be_confirmed"
    CONFIRMED = "confirmed"


class DatabaseTableType(str, Enum):
    PHYSICAL = "physical"
    LOGICAL = "logical"


class DatabaseTableStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class IndexType(str, Enum):
    """Access method of a table index (Postgres index types)."""

    BTREE = "btree"
    HASH = "hash"
    GIN = "gin"
    GIST = "gist"
    BRIN = "brin"


class ConstraintType(str, Enum):
    """Kind of a table constraint."""

    PRIMARY_KEY = "primary_key"
    UNIQUE = "unique"
    FOREIGN_KEY = "foreign_key"
    CHECK = "check"
    NOT_NULL = "not_null"


class ReferentialAction(str, Enum):
    """`ON DELETE` / `ON UPDATE` action of a foreign-key constraint."""

    NO_ACTION = "no_action"
    RESTRICT = "restrict"
    CASCADE = "cascade"
    SET_NULL = "set_null"
    SET_DEFAULT = "set_default"


class ApplicationGuardType(str, Enum):
    HEADER_BEARER = "header_bearer"
    HEADER_BASIC = "header_basic"
    HEADER_TOKEN = "header_token"
    QUERY_TOKEN = "query_token"


class ApplicationGuardStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ApplicationGuardFieldType(str, Enum):
    HEADER = "header"
    QUERY = "query"
    POST_DATA = "post_data"
    RAW_DATA = "raw_data"


class ApplicationGuardFieldFormat(str, Enum):
    JWT = "JWT"


class ApplicationRoleStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ApplicationComponentType(str, Enum):
    """The kind of building block a component is.

    Architectural rather than visual: a component is a piece the application is
    built from — its front, its back, a shared library, an async worker, a
    third-party integration.
    """

    FRONTEND = "frontend"
    BACKEND = "backend"
    LIBRARY = "library"
    WORKER = "worker"
    INTEGRATION = "integration"
    OTHER = "other"


class ApplicationComponentStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ApplicationRouteStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ApplicationRouteMethod(str, Enum):
    POST = "POST"
    GET = "GET"
    PATCH = "PATCH"
    PUT = "PUT"
    DELETE = "DELETE"
    QUERY = "QUERY"


class ApplicationRouteResponseFormat(str, Enum):
    JSON = "JSON"
    XML = "XML"
    HTML = "HTML"
    TXT = "TXT"


class ApplicationRouteTableType(str, Enum):
    QUERY_PARAMS = "query_params"
    QUERY_DATA = "query_data"
    QUERY_HEADER = "query_header"
    RESPONSE_DATA = "response_data"
    RESPONSE_HEADER = "response_header"


class ApplicationRouteTableAction(str, Enum):
    READ = "read"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


class EntityType(str, Enum):
    """The kind of account entity a comment or a vote can be attached to.

    Shared, centralized list so comments and votes point at the same set of
    targets by (`entity_type`, `entity_id`) — the polymorphic pair both tables
    carry instead of a foreign key. Backed by a single Postgres enum type
    (`entity_type`).
    """

    FEATURE = "feature"
    APPLICATION = "application"
    APPLICATION_ROUTE = "application_route"
    JOURNEY = "journey"
    PERSONA = "persona"
    DATABASE = "database"
    DATABASE_TABLE = "database_table"
    DATABASE_TABLE_COLUMN = "database_table_column"
    DATABASE_MIGRATION = "database_migration"
    DATABASE_MIGRATION_COLUMN = "database_migration_column"
    SERVICE = "service"
    SERVICE_ACTION = "service_action"
    JOURNEY_SCENARIO = "journey_scenario"
    JOURNEY_SCENARIO_STEP = "journey_scenario_step"
    APPLICATION_COMPONENT = "application_component"
    APPLICATION_BOUNDED_CONTEXT = "application_bounded_context"


class SearchEntityType(str, Enum):
    """The kind of entity a full-text `search` index row points at.

    A superset of `EntityType`: every entity a comment/vote can target is also
    searchable, plus `comment` itself (a comment's rich-text is indexed and its
    result links back to the commented entity). Kept separate from `EntityType`
    so the search surface can grow on its own — `EntityType` is locked in
    lock-step with `entity_ref._SPECS` (a hard `assert`), whereas search may index
    kinds that have no polymorphic entity_ref. Backed by its own Postgres enum
    type (`search_entity_type`).
    """

    FEATURE = "feature"
    APPLICATION = "application"
    APPLICATION_ROUTE = "application_route"
    JOURNEY = "journey"
    PERSONA = "persona"
    DATABASE = "database"
    DATABASE_TABLE = "database_table"
    DATABASE_TABLE_COLUMN = "database_table_column"
    DATABASE_MIGRATION = "database_migration"
    DATABASE_MIGRATION_COLUMN = "database_migration_column"
    SERVICE = "service"
    SERVICE_ACTION = "service_action"
    JOURNEY_SCENARIO = "journey_scenario"
    JOURNEY_SCENARIO_STEP = "journey_scenario_step"
    APPLICATION_COMPONENT = "application_component"
    APPLICATION_BOUNDED_CONTEXT = "application_bounded_context"
    COMMENT = "comment"


class ServiceType(str, Enum):
    """Where the service comes from."""

    INTERNAL = "internal"
    EXTERNAL = "external"
    THIRD_PARTY = "third_party"
    OTHER = "other"


class ServiceCategory(str, Enum):
    """Functional category of a service, orthogonal to `ServiceType`.

    `type` says where a service comes from (internal/external/…); `category`
    says what it does. Values are a public contract — never rename a member
    (issued data references it); add new members instead.
    """

    PAYMENT = "payment"
    COMMUNICATION = "communication"
    AUTOMATION = "automation"
    CONTRACTUALIZATION = "contractualization"
    AUTHENTICATION = "authentication"
    STORAGE = "storage"
    ANALYTICS = "analytics"
    MESSAGING = "messaging"
    MONITORING = "monitoring"
    HOSTING = "hosting"
    DATABASE = "database"
    OTHER = "other"


class ServiceStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ServiceActionType(str, Enum):
    """Nature of the call exposed by a service action."""

    ENDPOINT = "endpoint"
    WEBHOOK = "webhook"
    EVENT = "event"
    JOB = "job"
    OTHER = "other"


class ServiceActionStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class ServiceActionMethod(str, Enum):
    """HTTP method of a service action (absent for non-HTTP actions)."""

    POST = "POST"
    GET = "GET"
    PATCH = "PATCH"
    PUT = "PUT"
    DELETE = "DELETE"
    QUERY = "QUERY"


class CommentStatus(str, Enum):
    PUBLISHED = "published"
    REMOVED = "removed"


class LinkType(str, Enum):
    """What a reference attached to an entity points at.

    Deliberately short: the kind is what the UI groups and colours by, not a
    taxonomy of every tool a team uses. `kartographe` marks a reference to
    another entity of the same instance — the serializer resolves it into a
    structured `internal` block when the reader may see the target.
    """

    TICKET = "ticket"
    DOCUMENTATION = "documentation"
    DESIGN = "design"
    KARTOGRAPHE = "kartographe"
    OTHER = "other"


class VoteRole(str, Enum):
    """The hat a member wears when voting on an entity.

    Snapshotted onto each vote from the member's `vote_role` (see
    `AccountUser.vote_role`), so a vote records the standpoint it was cast from
    even if the member's role later changes. `other` is the default for members
    with no domain-specific voting role.
    """

    PRODUCT_OWNER = "product_owner"
    DEVELOPER = "developer"
    QA = "qa"
    DATA_ANALYST = "data_analyst"
    OTHER = "other"


class ComplexityMode(str, Enum):
    """The estimation scale a complexity is expressed on.

    Set per account and per scope (`Account.technical_complexity_mode` /
    `product_complexity_mode`), snapshotted onto each estimate so a stored value
    stays readable after the account switches scale. The allowed values of each
    scale live in `src/utils/complexity.py`.
    """

    FIBONACCI = "fibonacci"
    MODIFIED_FIBONACCI = "modified_fibonacci"
    POWERS_OF_TWO = "powers_of_two"
    LINEAR = "linear"


class ComplexityLevel(str, Enum):
    """How heavy an estimate reads, whatever the scale it was given on.

    Derived from where the value sits in the account's scale (`level_for` in
    `src/utils/complexity.py`), so a 13 on Fibonacci and an 8 on powers of two
    both read as the same weight to someone who does not know the scale.
    """

    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EXTREME = "extreme"


class ComplexityScope(str, Enum):
    """Which of the account's two scales an entity is estimated on.

    Technical entities (applications, routes, databases, services) are estimated
    by the build side, product entities (features, personas, journeys) by the
    product side — each with its own mode.
    """

    TECHNICAL = "technical"
    PRODUCT = "product"


class VoteValue(str, Enum):
    """A member's stance on an entity.

    `pending_question` flags an open question ("?") rather than an opinion;
    `dont_know` is an explicit abstention.
    """

    UPVOTE = "upvote"
    DOWNVOTE = "downvote"
    PENDING_QUESTION = "pending_question"
    DONT_KNOW = "dont_know"


class TagEntityType(str, Enum):
    """The kind of entity a tag can be attached to."""

    APPLICATION = "application"
    APPLICATION_ROUTE = "application_route"
    APPLICATION_GUARD = "application_guard"
    APPLICATION_COMPONENT = "application_component"
    FEATURE = "feature"
    JOURNEY = "journey"
    JOURNEY_SCENARIO = "journey_scenario"
    JOURNEY_SCENARIO_STEP = "journey_scenario_step"
    PERSONA = "persona"
    DATABASE = "database"
    DATABASE_TABLE = "database_table"
    DATABASE_TABLE_COLUMN = "database_table_column"
