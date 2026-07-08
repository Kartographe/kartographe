"""`/me/*` — the signed-in user's own profile and security settings.

Root-mounted (unversioned, like `/auth`) and excluded from the MCP tool surface.
Every endpoint requires a valid access token via `CurrentUserDep`.
"""

from fastapi import APIRouter

from src.routes.api.me.mcp import router as mcp_router
from src.routes.api.me.me import router as profile_router
from src.routes.api.me.security import router as security_router
from src.serializes.errors import ValidationErrorResponse

_RESPONSES = {422: {"model": ValidationErrorResponse, "description": "Some fields contain invalid values"}}

router = APIRouter(responses=_RESPONSES)
router.include_router(profile_router)
router.include_router(security_router)
router.include_router(mcp_router)
