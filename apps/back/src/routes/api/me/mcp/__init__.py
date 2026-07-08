"""`/me/mcp/*` — the signed-in user's MCP consent + connected-apps endpoints."""

from fastapi import APIRouter

from src.routes.api.me.mcp.authorize import router as authorize_router
from src.routes.api.me.mcp.grants import router as grants_router
from src.serializes.errors import ValidationErrorResponse

_RESPONSES = {422: {"model": ValidationErrorResponse, "description": "Some fields contain invalid values"}}

router = APIRouter(responses=_RESPONSES)
router.include_router(authorize_router)
router.include_router(grants_router)
