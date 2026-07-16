# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/core/*` — global reference catalogues (action & assertion types).

Read-only, not account-scoped: any authenticated user may read them. Mounted
under the versioned router, so they are also exposed as MCP tools.
"""

from fastapi import APIRouter

from src.routes.api.core.action_types import router as action_types_router
from src.routes.api.core.assertion_types import router as assertion_types_router
from src.routes.api.core.database_column_types import router as database_column_types_router

router = APIRouter()
router.include_router(action_types_router)
router.include_router(assertion_types_router)
router.include_router(database_column_types_router)
