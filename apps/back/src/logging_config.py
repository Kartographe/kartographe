"""Process-wide logging setup, driven by the per-typology `LOG_LEVEL_*` settings."""

import logging

from src.settings import Settings, get_settings

_FORMAT = "%(asctime)s %(levelname)-8s %(name)s: %(message)s"

# Typology → the logger roots it governs. Levels are applied to these names;
# every child logger inherits unless it carries an explicit level of its own.
TYPOLOGY_LOGGERS: dict[str, tuple[str, ...]] = {
    # Our own code: `logging.getLogger("kartographe.<something>")`.
    "app": ("kartographe",),
    # `sqlalchemy.engine` at INFO echoes every statement; at DEBUG, every row.
    "sql": ("sqlalchemy.engine", "sqlalchemy.pool", "alembic"),
    # Uvicorn's startup/error channel, plus FastAPI itself.
    "server": ("uvicorn", "uvicorn.error", "fastapi"),
    # The per-request access log. Set to WARNING to silence it entirely.
    "access": ("uvicorn.access",),
    # The MCP transport and the `fastapi-mcp` bridge.
    "mcp": ("mcp", "fastapi_mcp"),
}


def configure_logging(settings: Settings | None = None) -> None:
    """Apply `LOG_LEVEL` and each `LOG_LEVEL_<TYPOLOGY>` to the logger tree.

    Called from `create_app()`. Uvicorn installs its own logging config while
    building its `Config`, i.e. *before* it imports the ASGI app — so the levels
    set here land after uvicorn's and win.
    """
    settings = settings or get_settings()

    # `force=True` so a second call (tests, reload) re-points the root handler
    # instead of stacking a duplicate one. Uvicorn attaches its handlers to the
    # `uvicorn.*` loggers, which don't propagate — none of them are lost here.
    logging.basicConfig(level=settings.log_level, format=_FORMAT, force=True)

    for typology, logger_names in TYPOLOGY_LOGGERS.items():
        level = settings.resolved_log_level(typology)
        for logger_name in logger_names:
            logging.getLogger(logger_name).setLevel(level)
