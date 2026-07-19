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
# Pool sized to the anyio threadpool that runs the sync routes (see the
# `db_pool_*` settings): the DB, not SQLAlchemy's 15-connection default, is the
# real concurrency ceiling. `pool_pre_ping` discards dead connections before
# handing them out; `pool_recycle` retires long-lived ones before the server or
# a load balancer drops them under us.
engine = create_engine(
    _settings.database_url,
    pool_pre_ping=True,
    pool_size=_settings.db_pool_size,
    max_overflow=_settings.db_pool_max_overflow,
    pool_timeout=_settings.db_pool_timeout,
    pool_recycle=_settings.db_pool_recycle,
)


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
