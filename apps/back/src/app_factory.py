from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.responses import HTMLResponse
from scalar_fastapi import get_scalar_api_reference
from starlette.middleware.cors import CORSMiddleware

from src.openapi_info import openapi_info
from src.openapi_tags import tags_for_api
from src.settings import get_settings


def create_app(router: APIRouter, *, mount_mcp: bool = False) -> FastAPI:
    """Build the Kartographe FastAPI app.

    - Disables Swagger/Redoc; serves Scalar at `/docs` (gated by `DOCS_ENABLED`).
    - Mounts the `fastapi-mcp` server when `mount_mcp=True` so every `/v1/*`
      route becomes an MCP tool reachable through the `/mcp` transport.
    """
    settings = get_settings()
    info = openapi_info()

    # Captured by the lifespan closure below; filled in when `mount_mcp=True`.
    fastapi_mcp_instance: object | None = None

    @asynccontextmanager
    async def _lifespan(_: FastAPI):
        # fastapi-mcp starts the StreamableHTTPSessionManager lazily on the
        # first request, which races against that request under cold start.
        # Start it eagerly here so the first MCP call is deterministic.
        transport = getattr(fastapi_mcp_instance, "_http_transport", None)
        if transport is not None:
            await transport._ensure_session_manager_started()
        try:
            yield
        finally:
            if transport is not None:
                await transport.shutdown()

    app = FastAPI(
        title=info["title"],
        description=info["description"],
        version=settings.app_version,
        servers=info["servers"],
        debug=settings.app_debug,
        docs_url=None,
        redoc_url=None,
        openapi_tags=tags_for_api(),
        lifespan=_lifespan,
    )

    # CORS — accept any origin. `allow_origin_regex=".*"` (instead of
    # `allow_origins=["*"]`) is required because browsers refuse the literal
    # `*` when the fetch is made with `credentials: 'include'`.
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)

    # Scalar HTML reference at `GET /docs`. `openapi.json` stays reachable
    # regardless so MCP clients / SDK generators keep working — only the HTML
    # viewer is gated by `DOCS_ENABLED`.
    if settings.docs_enabled:

        @app.get("/docs", include_in_schema=False)
        def scalar_docs() -> HTMLResponse:
            return get_scalar_api_reference(
                openapi_url=app.openapi_url,
                title=info["title"],
                hide_models=True,
            )

    if mount_mcp:
        try:
            from fastapi_mcp import FastApiMCP

            mcp = FastApiMCP(
                app,
                name=f"{settings.app_name} MCP",
                description="MCP server exposing the Kartographe platform as tools for AI agents.",
                exclude_tags=["api.health"],
            )
            mcp.mount_http(mount_path=settings.mcp_mount_path)
            # Expose to the lifespan closure so the StreamableHTTP session
            # manager is started during FastAPI startup rather than racing the
            # first MCP request.
            fastapi_mcp_instance = mcp
        except ImportError:
            pass

    return app
