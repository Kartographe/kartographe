# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/bounded-contexts` — account-wide listing.

Bounded contexts are created and edited inside their application; this router
carries the cross-application read. Mounted under the versioned router.
"""

from fastapi import APIRouter

from src.routes.api.bounded_contexts.bounded_contexts import router as bounded_contexts_router

router = APIRouter()
router.include_router(bounded_contexts_router)
