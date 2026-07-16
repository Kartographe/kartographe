# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/tags` — colored labels for account entities.

Mounted under the versioned router, so every endpoint here is also exposed as an
MCP tool. Reads require account membership; writes are role-gated.
"""

from fastapi import APIRouter

from src.routes.api.tags.tags import router as tags_router

router = APIRouter()
router.include_router(tags_router)
