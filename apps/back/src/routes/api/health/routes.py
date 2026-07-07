from fastapi import APIRouter

from src.serializes.health import HealthResponse
from src.settings import get_settings

router = APIRouter(prefix="/health", tags=["api.health"])


@router.get(
    "",
    operation_id="api.health.check",
    summary="Liveness probe",
    description=(
        "Lightweight liveness probe for monitoring tooling (load balancers, "
        "uptime checks, deploy pipelines). Always returns `200 OK` when the "
        "process is alive."
    ),
    response_model=HealthResponse,
    status_code=200,
)
def health_check() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(status="ok", version=settings.app_version, environment=settings.app_env)
