"""`/auth/*` — authentication surface.

Mounted at the **root** (not under `/v1`): the auth endpoints move lock-step
with the API and stay unversioned, like `/health`. Excluded from the MCP tool
surface (see `app_factory`).

Turnstile gates the entry points (register, activate, login, password, SSO).
The multi-hop flows carry their own short-lived token that already proves the
first hop passed, so `twoFactor/*` and `refresh` are **not** Turnstile-gated.
"""

from fastapi import APIRouter

from src.routes.api.auth.activate import router as activate_router
from src.routes.api.auth.login import router as login_router
from src.routes.api.auth.password import router as password_router
from src.routes.api.auth.refresh import router as refresh_router
from src.routes.api.auth.register import router as register_router
from src.routes.api.auth.sso import router as sso_router
from src.routes.api.auth.two_factor import router as two_factor_router
from src.serializes.errors import ValidationErrorResponse
from src.utils.middlewares import TurnstileGuard

_RESPONSES = {422: {"model": ValidationErrorResponse, "description": "Some fields contain invalid values"}}

router = APIRouter(prefix="/auth", tags=["api.auth"], responses=_RESPONSES)

# Turnstile-gated entry points.
for _guarded in (register_router, activate_router, login_router, password_router, sso_router):
    router.include_router(_guarded, dependencies=[TurnstileGuard])

# Token-carrying hops — not Turnstile-gated.
router.include_router(two_factor_router)
router.include_router(refresh_router)
