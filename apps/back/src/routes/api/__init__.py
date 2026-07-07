"""Root router for the API app.

Two mounting points:

- `v1_router` (`prefix="/v1"`) — versioned public surface. Anything new
  defaults here and (when MCP is enabled) becomes an MCP tool.
- Root router — unversioned / internal endpoints. Currently just `/health`.
"""

from fastapi import APIRouter

from src.routes.api.health import router as health_router

router = APIRouter()

# `/v1/*` — versioned public surface. Empty for now; feature routers get
# included here as the API grows.
v1_router = APIRouter(prefix="/v1")
router.include_router(v1_router)

# Out-of-version ops endpoints.
router.include_router(health_router)
