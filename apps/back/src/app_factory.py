from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from scalar_fastapi import get_scalar_api_reference

from src.logging_config import configure_logging
from src.managers.mcp_oauth import MCPOAuthError
from src.openapi_info import openapi_info
from src.openapi_tags import tags_for_api
from src.settings import get_settings
from src.utils.validation_errors import validation_error_handler


def create_app(router: APIRouter, *, mount_mcp: bool = False) -> FastAPI:
    """Build the Kartographe FastAPI app.

    - Applies the per-typology log levels (`LOG_LEVEL`, `LOG_LEVEL_*`).
    - Disables Swagger/Redoc; serves Scalar at `/docs` (gated by `DOCS_ENABLED`).
    - Mounts the `fastapi-mcp` server when `mount_mcp=True` so every `/v1/*`
      route becomes an MCP tool reachable through the `/mcp` transport.
    """
    settings = get_settings()
    configure_logging(settings)
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

    # Normalise 422s into the `{ detail, errors[] }` envelope (and stop leaking
    # submitted values such as plaintext passwords).
    app.add_exception_handler(RequestValidationError, validation_error_handler)

    # MCP OAuth errors render the standard `{ error, error_description }` shape.
    async def _mcp_oauth_error_handler(_: Request, exc: MCPOAuthError) -> JSONResponse:
        return JSONResponse(
            {"error": exc.error, "error_description": exc.error_description},
            status_code=exc.status_code,
        )

    app.add_exception_handler(MCPOAuthError, _mcp_oauth_error_handler)

    app.include_router(router)

    # In local storage mode, serve uploaded files from a static mount. Mark them
    # `no-store` (so an updated avatar isn't served stale) and CORP cross-origin
    # (so the front on another origin can load them via `<img>` / fetch).
    if settings.storage_backend == "local":
        uploads_dir = Path(__file__).resolve().parent.parent / settings.storage_local_root
        uploads_dir.mkdir(parents=True, exist_ok=True)
        mount_path = "/" + settings.storage_public_url_base.strip("/")
        app.mount(mount_path, StaticFiles(directory=uploads_dir), name="uploads")

        _uploads_prefix = mount_path + "/"

        @app.middleware("http")
        async def _no_store_on_uploads(request, call_next):
            response = await call_next(request)
            if request.url.path.startswith(_uploads_prefix):
                response.headers["cache-control"] = "no-store"
                response.headers.setdefault("cross-origin-resource-policy", "cross-origin")
            return response

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
                # Keep the ops probe, the unversioned auth/me surfaces and the
                # OAuth/discovery endpoints out of the agent-callable tool set.
                exclude_tags=[
                    "api.health",
                    "api.auth",
                    "api.me",
                    "api.me.security",
                    "api.me.mcp",
                    "api.mcp.oauth",
                    "api.mcp.metadata",
                ],
            )
            mcp.mount_http(mount_path=settings.mcp_mount_path)
            # Expose to the lifespan closure so the StreamableHTTP session
            # manager is started during FastAPI startup rather than racing the
            # first MCP request.
            fastapi_mcp_instance = mcp

            # Gate the transport: require a valid MCP access token tied to an
            # active grant (but leave `/mcp/oauth/*` public for the flow itself).
            from src.utils.mcp_auth import MCPBearerMiddleware

            app.add_middleware(MCPBearerMiddleware, mount_path=settings.mcp_mount_path)
        except ImportError:
            pass

    return app
