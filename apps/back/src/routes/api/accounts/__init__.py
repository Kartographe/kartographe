# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/*` — multi-tenant workspaces, members and invitations.

Mounted under the versioned router, so every endpoint here is also exposed as
an MCP tool. Authorization is per-account: `require_role` gates the writes.
"""

from fastapi import APIRouter

from src.routes.api.accounts.accounts import router as accounts_router
from src.routes.api.accounts.entitlements import router as entitlements_router
from src.routes.api.accounts.invitations import router as invitations_router
from src.routes.api.accounts.search import router as search_router
from src.routes.api.accounts.stats import router as stats_router
from src.routes.api.accounts.usage import router as usage_router
from src.routes.api.accounts.users import router as users_router

router = APIRouter()
router.include_router(accounts_router)
router.include_router(users_router)
router.include_router(invitations_router)
router.include_router(usage_router)
router.include_router(entitlements_router)
router.include_router(stats_router)
router.include_router(search_router)
