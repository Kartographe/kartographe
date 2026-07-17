# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from src.settings import get_settings

_settings = get_settings()

# SQL statement logging is driven entirely by the `sql` typology level
# (`LOG_LEVEL_SQL`, see logging_config.py) — deliberately NOT by `echo`.
# `echo=True` installs an `InstanceLogger` that emits every statement
# unconditionally (via `logger._log()`), bypassing the level set by
# `configure_logging()` — so it would silently defeat `LOG_LEVEL_SQL=WARNING`.
# Leave echo at its default and set `LOG_LEVEL_SQL=INFO` (statements) or
# `DEBUG` (statements + rows) to turn SQL logging on.
engine = create_engine(_settings.database_url, pool_pre_ping=True)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency: one request = one transaction.

    Commits if the handler returns successfully, rolls back on any
    exception (including `HTTPException`). Routes therefore never have to
    call `session.commit()` explicitly.
    """
    with Session(engine) as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
