"""Guard dependencies — read the request and raise to deny.

Naming convention: `require_<thing>(...)` for the function, plus a pre-wrapped
`<Thing>Guard = Depends(require_<thing>)` for concise use on routers:

    router = APIRouter(prefix="/auth", dependencies=[TurnstileGuard])
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole
from src.services.turnstile import TurnstileService
from src.settings import get_settings
from src.utils.dependencies import CurrentAccountUserDep, RequestIp

# On the `/auth/*` surface there is no user session yet, so the bearer slot
# carries the Cloudflare Turnstile token instead.
_turnstile_bearer = HTTPBearer(
    scheme_name="TurnstileToken",
    description="Cloudflare Turnstile token proving the request is human.",
    auto_error=False,
)


def require_turnstile(
    request_ip: RequestIp,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_turnstile_bearer)],
) -> None:
    """Reject the request unless it carries a valid Turnstile token.

    No-op when Turnstile is not configured (no secret), so local dev is
    unaffected.
    """
    if not get_settings().turnstile_enabled:
        return
    if credentials is None or not credentials.credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Anti-bot verification required.")
    if not TurnstileService.verify(credentials.credentials, remote_ip=request_ip):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Anti-bot verification failed. Please try again.")


TurnstileGuard = Depends(require_turnstile)


def require_role(*roles: AccountUserRole):
    """Build a guard that rejects unless the caller's account membership holds
    one of `roles`. Resolves `CurrentAccountUserDep` (so it also enforces
    membership on the `{account_id}` route), then checks the role.

    Usage on a route:

        @router.patch("/accounts/{account_id}", dependencies=[Depends(require_role(
            AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR))])
    """
    allowed = frozenset(roles)

    def _guard(account_user: CurrentAccountUserDep) -> AccountUser:
        if account_user.role not in allowed:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "You don't have permission to perform this action on this account.",
            )
        return account_user

    return _guard
