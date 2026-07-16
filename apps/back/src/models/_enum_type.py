# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Postgres enum naming/storage convention.

By default SQLAlchemy names the Postgres enum type after the Python class name
lowercased (`userauthenticationtwofactortype`) and stores the member **name**
(`EMAIL_PASSWORD`). Both read badly next to the rest of the schema.

Patching `sqlalchemy.Enum.__init__` once, centrally, makes every enum column:
- get a **snake_case** type name derived from the class (`user_authentication_two_factor_type`),
- persist the member **value** (`email_password`) — consistent with the
  camelCase/value contract the API exposes.

Imported for its side effect by `src/models/_base.py`, so the patch is active
before any table class builds its columns.
"""

import re
from enum import Enum as PyEnum

from sqlalchemy import Enum as SAEnum

_CAMEL_BOUNDARY = re.compile(r"(?<!^)(?=[A-Z])")
_original_init = SAEnum.__init__


def _snake_case(name: str) -> str:
    return _CAMEL_BOUNDARY.sub("_", name).lower()


def _patched_init(self, *enums, **kwargs):
    if len(enums) == 1 and isinstance(enums[0], type) and issubclass(enums[0], PyEnum):
        enum_class = enums[0]
        kwargs.setdefault("name", _snake_case(enum_class.__name__))
        kwargs.setdefault("values_callable", lambda cls: [member.value for member in cls])
    _original_init(self, *enums, **kwargs)


SAEnum.__init__ = _patched_init
