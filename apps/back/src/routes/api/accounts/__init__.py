"""`/v1/accounts/*` — multi-tenant workspaces, members and invitations.

Mounted under the versioned router, so every endpoint here is also exposed as
an MCP tool. Authorization is per-account: `require_role` gates the writes.
"""

from fastapi import APIRouter

from src.routes.api.accounts.accounts import router as accounts_router
from src.routes.api.accounts.invitations import router as invitations_router
from src.routes.api.accounts.usage import router as usage_router
from src.routes.api.accounts.users import router as users_router

router = APIRouter()
router.include_router(accounts_router)
router.include_router(users_router)
router.include_router(invitations_router)
router.include_router(usage_router)
