# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/complexities` — account-wide complexity listing.

The per-entity complexity endpoints (list/estimate on an application, feature,
journey, …) live in their own domains; this router carries the account-level
read, the scales, and the mutualized estimate. Mounted under the versioned
router.
"""

from fastapi import APIRouter

from src.routes.api.complexities.complexities import router as complexities_router

router = APIRouter()
router.include_router(complexities_router)
