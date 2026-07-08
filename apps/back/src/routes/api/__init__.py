"""Root router for the API app.

Two mounting points:

- `v1_router` (`prefix="/v1"`) — versioned public surface. Anything new
  defaults here and (when MCP is enabled) becomes an MCP tool.
- Root router — unversioned / internal endpoints. Currently just `/health`.
"""

from fastapi import APIRouter

from src.routes.api.accounts import router as accounts_router
from src.routes.api.applications import router as applications_router
from src.routes.api.auth import router as auth_router
from src.routes.api.features import router as features_router
from src.routes.api.health import router as health_router
from src.routes.api.mcp import router as mcp_router
from src.routes.api.me import router as me_router

router = APIRouter()

# `/v1/*` — versioned public surface; every route here is also an MCP tool.
v1_router = APIRouter(prefix="/v1")
v1_router.include_router(accounts_router)  # multi-tenant workspaces & members
v1_router.include_router(applications_router)  # applications, environments, versions, deployments
v1_router.include_router(features_router)  # account features & their files
router.include_router(v1_router)

# Out-of-version endpoints, mounted at the root.
router.include_router(health_router)  # ops liveness probe
router.include_router(auth_router)  # authentication (lock-step with the API)
router.include_router(me_router)  # current-user profile & security
router.include_router(mcp_router)  # MCP OAuth discovery + flow (root-mounted)
