# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Guard: every ORM mapper must configure.

SQLAlchemy configures mappers lazily (on first query), so a broken
`Relationship()` — e.g. a string annotation SQLAlchemy can't resolve to a class,
like a `"Model | None"` union — stays invisible until the first real query at
runtime. Forcing a full configuration here fails fast in CI instead.
"""

import src.models  # noqa: F401  (registers every model on the registry)
from sqlalchemy.orm import configure_mappers


def test_all_mappers_configure():
    configure_mappers()
