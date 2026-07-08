"""`/mcp/*` and `/.well-known/*` — MCP OAuth discovery + flow, root-mounted."""

from fastapi import APIRouter

from src.routes.api.mcp.metadata import router as metadata_router
from src.routes.api.mcp.oauth import router as oauth_router

router = APIRouter()
router.include_router(metadata_router)
router.include_router(oauth_router)
