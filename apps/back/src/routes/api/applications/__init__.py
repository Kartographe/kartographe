# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/applications/*` — applications and everything that
hangs off them: environments, versions, deployments and feature links.

Mounted under the versioned router, so every endpoint here is also exposed as an
MCP tool. Authorization is per-account: reads require membership, writes are
role-gated (`require_role`), and every object is re-checked against the account
(and its parent resource) behind the URL.
"""

from fastapi import APIRouter

from src.routes.api.applications.applications import router as applications_router
from src.routes.api.applications.comments import router as comments_router
from src.routes.api.applications.environment_versions import router as environment_versions_router
from src.routes.api.applications.environments import router as environments_router
from src.routes.api.applications.features import router as features_router
from src.routes.api.applications.guards import router as guards_router
from src.routes.api.applications.roles import router as roles_router
from src.routes.api.applications.route_comments import router as route_comments_router
from src.routes.api.applications.route_examples import router as route_examples_router
from src.routes.api.applications.route_responses import router as route_responses_router
from src.routes.api.applications.route_tables import router as route_tables_router
from src.routes.api.applications.route_votes import router as route_votes_router
from src.routes.api.applications.routes import router as routes_router
from src.routes.api.applications.versions import router as versions_router
from src.routes.api.applications.votes import router as votes_router

router = APIRouter()
router.include_router(applications_router)
router.include_router(environments_router)
router.include_router(versions_router)
router.include_router(environment_versions_router)
router.include_router(features_router)
router.include_router(guards_router)
router.include_router(roles_router)
router.include_router(routes_router)
router.include_router(route_responses_router)
router.include_router(route_examples_router)
router.include_router(route_tables_router)
router.include_router(comments_router)
router.include_router(route_comments_router)
router.include_router(votes_router)
router.include_router(route_votes_router)
