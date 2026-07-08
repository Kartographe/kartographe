"""`/v1/accounts/{account_id}/applications/*` — applications and everything that
hangs off them: environments, versions, deployments and feature links.

Mounted under the versioned router, so every endpoint here is also exposed as an
MCP tool. Authorization is per-account: reads require membership, writes are
role-gated (`require_role`), and every object is re-checked against the account
(and its parent resource) behind the URL.
"""

from fastapi import APIRouter

from src.routes.api.applications.applications import router as applications_router
from src.routes.api.applications.environment_versions import router as environment_versions_router
from src.routes.api.applications.environments import router as environments_router
from src.routes.api.applications.features import router as features_router
from src.routes.api.applications.versions import router as versions_router

router = APIRouter()
router.include_router(applications_router)
router.include_router(environments_router)
router.include_router(versions_router)
router.include_router(environment_versions_router)
router.include_router(features_router)
