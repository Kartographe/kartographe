"""`/oauth/*` and `/.well-known/*` — OAuth discovery + flow, root-mounted.

The flow endpoints live at the root (outside the `/mcp` transport mount), so the
transport-gating middleware never sees them and they stay reachable without a
token. The MCP transport is one consumer of this authorization server.
"""

from fastapi import APIRouter

from src.routes.api.oauth.authorize import router as authorize_router
from src.routes.api.oauth.device import router as device_router
from src.routes.api.oauth.metadata import router as metadata_router
from src.routes.api.oauth.register import router as register_router
from src.routes.api.oauth.revoke import router as revoke_router
from src.routes.api.oauth.token import router as token_router

_flow_router = APIRouter(prefix="/oauth", tags=["api.oauth"])
_flow_router.include_router(register_router)
_flow_router.include_router(authorize_router)
_flow_router.include_router(token_router)
_flow_router.include_router(device_router)
_flow_router.include_router(revoke_router)

router = APIRouter()
router.include_router(metadata_router)
router.include_router(_flow_router)
