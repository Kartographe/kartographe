# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/votes` — account-wide vote listing.

The per-entity vote endpoints (list/cast on an application, feature, journey, …)
live in their own domains; this router carries the account-level read. Mounted
under the versioned router.
"""

from fastapi import APIRouter

from src.routes.api.votes.votes import router as votes_router

router = APIRouter()
router.include_router(votes_router)
