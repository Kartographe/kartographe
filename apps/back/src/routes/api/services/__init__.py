# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/services/*` — services, their actions and comments.

Mounted under the versioned router, so every endpoint here is also exposed as an
MCP tool. Reads require account membership; writes are role-gated, and every
object is re-checked against the account (and its parent service) behind the URL.
"""

from fastapi import APIRouter

from src.routes.api.services.action_comments import router as action_comments_router
from src.routes.api.services.action_complexities import router as action_complexities_router
from src.routes.api.services.complexities import router as complexities_router
from src.routes.api.services.action_votes import router as action_votes_router
from src.routes.api.services.actions import router as actions_router
from src.routes.api.services.comments import router as comments_router
from src.routes.api.services.services import router as services_router
from src.routes.api.services.votes import router as votes_router

router = APIRouter()
router.include_router(services_router)
router.include_router(actions_router)
router.include_router(comments_router)
router.include_router(action_comments_router)
router.include_router(votes_router)
router.include_router(action_votes_router)
router.include_router(complexities_router)
router.include_router(action_complexities_router)
