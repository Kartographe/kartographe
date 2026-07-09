"""`/v1/accounts/{account_id}/personas` — user archetypes.

Mounted under the versioned router, so every endpoint here is also exposed as an
MCP tool. Reads require account membership; writes are role-gated.
"""

from fastapi import APIRouter

from src.routes.api.personas.comments import router as comments_router
from src.routes.api.personas.personas import router as personas_router

router = APIRouter()
router.include_router(personas_router)
router.include_router(comments_router)
