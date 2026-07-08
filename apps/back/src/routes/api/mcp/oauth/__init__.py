"""`/mcp/oauth/*` — the OAuth flow (public; the transport middleware skips it)."""

from fastapi import APIRouter

from src.routes.api.mcp.oauth.authorize import router as authorize_router
from src.routes.api.mcp.oauth.device import router as device_router
from src.routes.api.mcp.oauth.register import router as register_router
from src.routes.api.mcp.oauth.revoke import router as revoke_router
from src.routes.api.mcp.oauth.token import router as token_router

router = APIRouter(prefix="/mcp/oauth", tags=["api.mcp.oauth"])
router.include_router(register_router)
router.include_router(authorize_router)
router.include_router(token_router)
router.include_router(device_router)
router.include_router(revoke_router)
