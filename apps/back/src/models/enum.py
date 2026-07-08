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


class McpGrantScope(str, Enum):
    """OAuth scope requested by / granted to an MCP client."""

    READ = "read"
    WRITE = "write"


class McpGrantStatus(str, Enum):
    ACTIVE = "active"
    REVOKED = "revoked"


class McpAuthorizationFlowType(str, Enum):
    DEVICE = "device"
    AUTHORIZATION_CODE = "authorization_code"


class McpAuthorizationRequestStatus(str, Enum):
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
