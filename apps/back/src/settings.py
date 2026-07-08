from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="Kartographe API")
    app_env: str = Field(default="local")
    app_debug: bool = Field(default=False)
    app_version: str = Field(default="0.1.0")

    # Public base URL of the API itself — surfaced in the OpenAPI `servers`
    # block so Scalar's "Try it" points at the right host.
    api_base_url: str = Field(default="http://localhost:8000")

    # Public base URL of the front SPA — used to build the links embedded in
    # transactional emails (activation, password reset) that must land the user
    # on a browser page, not on the API.
    app_url: str = Field(default="http://localhost:5173")

    database_url: str = Field(
        default="postgresql+psycopg2://app_user:app_password@localhost:5431/app_db",
    )

    # 256-bit (32-byte) minimum for HS256 — `pyjwt` raises
    # `InsecureKeyLengthWarning` below that. The default is an obvious
    # placeholder so real deployments always override it.
    jwt_secret: str = Field(default="dev-insecure-placeholder-change-me-32b")
    jwt_algorithm: str = Field(default="HS256")
    jwt_issuer: str = Field(default="kartographe")
    jwt_access_ttl_seconds: int = Field(default=3600)
    jwt_refresh_ttl_seconds: int = Field(default=86400)
    # Longer refresh TTL granted when the user ticks "remember me" at login.
    jwt_refresh_long_ttl_seconds: int = Field(default=604800)

    # TOTP (authenticator app) — the issuer label shown in the user's
    # authenticator next to the account.
    otp_issuer: str = Field(default="Kartographe")

    # WebAuthn / U2F (security keys). `rp_id` must be the registrable domain
    # (no scheme/port); `origins` are the exact browser origins allowed to
    # register/assert.
    webauthn_rp_id: str = Field(default="localhost")
    webauthn_rp_name: str = Field(default="Kartographe")
    webauthn_origins: list[str] = Field(default=["http://localhost:5173"])

    # Google SSO — the OAuth client id the front uses; the backend verifies the
    # ID token's `aud` against it. Feature is active only when this is set.
    google_client_id: str | None = Field(default=None)

    # Cloudflare Turnstile anti-bot on the `/auth/*` surface. Active only when a
    # secret is configured; otherwise the guard is a no-op (local dev needs no
    # Cloudflare keys).
    turnstile_secret: str | None = Field(default=None)
    turnstile_verify_url: str = Field(
        default="https://challenges.cloudflare.com/turnstile/v0/siteverify",
    )

    @property
    def turnstile_enabled(self) -> bool:
        """Turnstile is enforced only when a verification secret is present."""
        return bool(self.turnstile_secret)

    @property
    def google_enabled(self) -> bool:
        """Google sign-in is available only when a client id is configured."""
        return bool(self.google_client_id)

    # Transactional email. `SERVICE_EMAIL_TYPE` selects the backend
    # (`smtp` today); when unset, nothing is sent — the manager still runs, so
    # local dev and bare self-hosting work without an email provider.
    service_email_type: str | None = Field(default=None)
    email_emitter_address: str = Field(default="no-reply@kartographe.local")
    email_emitter_name: str = Field(default="Kartographe")
    smtp_host: str | None = Field(default=None)
    smtp_port: int = Field(default=587)
    smtp_user: str | None = Field(default=None)
    smtp_password: str | None = Field(default=None)
    smtp_use_tls: bool = Field(default=True)

    # Serve the FastAPI-MCP transport (`/mcp`) and expose the `/v1/*` routes
    # as MCP tools.
    mcp_enabled: bool = Field(default=True)
    mcp_mount_path: str = Field(default="/mcp")

    # Gate on `GET /docs` (the Scalar HTML reference). `openapi.json` stays
    # reachable regardless — only the HTML viewer is gated.
    docs_enabled: bool = Field(default=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
