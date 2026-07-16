# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/me/integrations/*` — the signed-in user's OAuth consent + connected-integrations endpoints."""

from fastapi import APIRouter

from src.routes.api.me.integrations.authorize import router as authorize_router
from src.routes.api.me.integrations.grants import router as grants_router
from src.serializes.errors import ValidationErrorResponse

_RESPONSES = {422: {"model": ValidationErrorResponse, "description": "Some fields contain invalid values"}}

router = APIRouter(responses=_RESPONSES)
router.include_router(authorize_router)
router.include_router(grants_router)
