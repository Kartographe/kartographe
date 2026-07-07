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
    }
