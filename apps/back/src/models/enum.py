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
