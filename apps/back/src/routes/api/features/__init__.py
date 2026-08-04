# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/features/*` — account-level features and the files
attached to them.

Mounted under the versioned router, so every endpoint here is also exposed as an
MCP tool. Reads require account membership; writes are role-gated
(`require_role`), and every object is re-checked against the account (and its
parent feature) behind the URL.
"""

from fastapi import APIRouter

from src.routes.api.features.comments import router as comments_router
from src.routes.api.features.features import router as features_router
from src.routes.api.features.files import router as files_router
from src.routes.api.features.journeys import router as journeys_router
from src.routes.api.features.links import router as links_router
from src.routes.api.features.complexities import router as complexities_router
from src.routes.api.features.votes import router as votes_router

router = APIRouter()
router.include_router(features_router)
router.include_router(files_router)
router.include_router(journeys_router)
router.include_router(comments_router)
router.include_router(links_router)
router.include_router(votes_router)
router.include_router(complexities_router)
