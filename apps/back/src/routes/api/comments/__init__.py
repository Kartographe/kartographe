"""`/v1/accounts/{account_id}/comments` — account-wide comment management.

The per-entity comment endpoints (list/post on an application, feature, journey,
…) live in their own domains; this router carries the account-level operations
(get, edit, remove, delete, replies). Mounted under the versioned router.
"""

from fastapi import APIRouter

from src.routes.api.comments.comments import router as comments_router

router = APIRouter()
router.include_router(comments_router)
