from src.app_factory import create_app
from src.routes.api import router as api_router
from src.settings import get_settings

_settings = get_settings()

app = create_app(api_router, mount_mcp=_settings.mcp_enabled)
