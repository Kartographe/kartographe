# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/links` — account-wide reference management.

The per-entity endpoints (list/attach on an application, feature, journey, …)
live in their own domains; this router carries the account-level operations
(list, attach to any entity, read, edit, delete, prefill). Mounted under the
versioned router.
"""

from fastapi import APIRouter

from src.routes.api.links.links import router as links_router

router = APIRouter()
router.include_router(links_router)
