# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from src.settings import get_settings

_settings = get_settings()

engine = create_engine(_settings.database_url, echo=_settings.app_debug, pool_pre_ping=True)


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
