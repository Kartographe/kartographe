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
    jwt_refresh_ttl_seconds: int = Field(default=604800)

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
