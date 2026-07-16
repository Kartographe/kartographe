# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Top-level OpenAPI metadata (title, description, servers).

Consumed by `src/app_factory.py::create_app` so the Scalar doc carries proper
branding instead of the generic "FastAPI" placeholders.

Important: every string in this module is **public** and ends up in
`openapi.json`. Write it for external integrators — no environment variables,
internal enums or implementation details.
"""

from typing import Any

from src.settings import get_settings

_API_DESCRIPTION = """\
The Kartographe API is the backend powering the Kartographe platform.

## Authentication

Endpoints under `/v1/*` expect a JWT access token in the `Authorization`
header:

```
Authorization: Bearer <access_token>
```

## Errors

Errors follow a consistent envelope:

```json
{ "detail": "Human-readable message" }
```

## Versioning

The public surface lives under `/v1/...`. Breaking changes ship as `/v2/...`
while `/v1/...` remains supported.

## License and source

Kartographe is open core. This API is licensed under the GNU Affero General
Public License v3.0, except for its `ee/` directory, which is licensed under
the Elastic License 2.0.

The AGPL requires that users interacting with this software over a network be
offered its Corresponding Source. The source is published at
<https://github.com/Kartographe/kartographe>.

If this instance runs a modified version, section 13 of the AGPL obliges its
operator — not the Kartographe project — to offer that modified source to you.
"""


def _servers() -> list[dict[str, str]]:
    settings = get_settings()
    return [
        {"url": settings.api_base_url, "description": settings.app_env.capitalize()},
    ]


def openapi_info() -> dict[str, Any]:
    return {
        "title": "Kartographe API",
        "description": _API_DESCRIPTION,
        "servers": _servers(),
        # Structured counterpart to the description's "License and source"
        # section: Scalar renders it, and it lands in `openapi.json` where
        # integrators can read it without parsing prose. `identifier` is the
        # OpenAPI 3.1 SPDX field and is mutually exclusive with `url`.
        "license_info": {
            "name": "AGPL-3.0-only",
            "identifier": "AGPL-3.0-only",
        },
        "contact": {
            "name": "ChallengeMyProject",
            "url": "https://www.challengemyproject.bzh",
            "email": "license@kartographe.eu",
        },
    }
