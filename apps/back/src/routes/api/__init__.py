# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

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
from src.routes.api.comments import router as comments_router
from src.routes.api.core import router as core_router
from src.routes.api.databases import router as databases_router
from src.routes.api.features import router as features_router
from src.routes.api.health import router as health_router
from src.routes.api.journeys import router as journeys_router
from src.routes.api.me import router as me_router
from src.routes.api.oauth import router as oauth_router
from src.routes.api.personas import router as personas_router
from src.routes.api.scenarios import router as scenarios_router
from src.routes.api.services import router as services_router
from src.routes.api.tags import router as tags_router
from src.routes.api.votes import router as votes_router

router = APIRouter()

# `/v1/*` — versioned public surface; every route here is also an MCP tool.
v1_router = APIRouter(prefix="/v1")
v1_router.include_router(accounts_router)  # multi-tenant workspaces & members
v1_router.include_router(applications_router)  # applications, environments, versions, deployments
v1_router.include_router(features_router)  # account features, their files & journey links
v1_router.include_router(personas_router)  # account personas
v1_router.include_router(journeys_router)  # journeys, scenarios, steps, files, assertions
v1_router.include_router(scenarios_router)  # account-wide scenario listing (across journeys)
v1_router.include_router(databases_router)  # databases, versions, tables, columns
v1_router.include_router(services_router)  # services & their actions
v1_router.include_router(tags_router)  # account tags
v1_router.include_router(comments_router)  # account-level comment management
v1_router.include_router(votes_router)  # account-level vote listing
v1_router.include_router(core_router)  # global action, assertion & column type catalogues
router.include_router(v1_router)

# Out-of-version endpoints, mounted at the root.
router.include_router(health_router)  # ops liveness probe
router.include_router(auth_router)  # authentication (lock-step with the API)
router.include_router(me_router)  # current-user profile & security
router.include_router(oauth_router)  # OAuth discovery + flow (root-mounted)
