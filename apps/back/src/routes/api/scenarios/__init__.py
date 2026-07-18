# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/scenarios` — account-wide scenario listing.

Scenarios are created and edited inside their journey
(`.../journeys/{journey_id}/scenarios`); this domain only offers a flat,
account-wide read across every journey (for dashboards and cross-journey views).
"""

from fastapi import APIRouter

from src.routes.api.scenarios.scenarios import router as scenarios_router

router = APIRouter()
router.include_router(scenarios_router)
