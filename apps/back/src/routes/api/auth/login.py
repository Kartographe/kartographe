from fastapi import APIRouter, status

from src.forms.auth import LoginForm
from src.serializes.auth import AuthResponse
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import AuthManagerDep

router = APIRouter()


@router.post(
    "/login",
    operation_id="api.auth.login",
    summary="Sign in with email and password",
    description=(
        "Authenticate with email and password. On success returns an access + "
        "refresh token pair. When the account has a second factor, returns a "
        "short-lived intermediate token and the list of factors to complete "
        "(`twoFactorEnabled: true`)."
    ),
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid email or password"},
        403: {"model": ErrorResponse, "description": "Account not activated or unavailable"},
    },
)
def login(form: LoginForm, manager: AuthManagerDep) -> AuthResponse:
    return manager.login(email=form.email, password=form.password, remember_me=form.remember_me)
