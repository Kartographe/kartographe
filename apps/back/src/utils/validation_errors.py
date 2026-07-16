# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Global handler rewriting FastAPI/Pydantic 422 into the API's error envelope.

The raw Pydantic response leaks internal type tags (`string_too_short`, …) and
echoes the submitted `input` — which would include plaintext passwords. This
handler intercepts every `RequestValidationError` and re-emits a stable
`{ detail, errors[] }` shape with client-facing codes and English messages.
"""

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Pydantic v2 error `type` → stable client-facing code.
_TYPE_TO_CODE: dict[str, str] = {
    "missing": "required",
    "string_too_short": "min_length",
    "string_too_long": "max_length",
    "string_pattern_mismatch": "pattern",
    "value_error": "invalid",
    "enum": "invalid_choice",
    "literal_error": "invalid_choice",
    "int_parsing": "invalid",
    "float_parsing": "invalid",
    "bool_parsing": "invalid",
    "json_invalid": "invalid",
    "greater_than": "invalid",
    "greater_than_equal": "invalid",
    "less_than": "invalid",
    "less_than_equal": "invalid",
}

_MESSAGES: dict[str, str] = {
    "required": "This field is required.",
    "min_length": "This value is too short.",
    "max_length": "This value is too long.",
    "pattern": "This value has an invalid format.",
    "invalid_choice": "This value is not one of the allowed options.",
    "invalid": "This value is invalid.",
}


def _field_path(loc: tuple) -> str:
    """Drop the `body`/`query`/`path` prefix and dot-join the remaining path."""
    parts = [str(p) for p in loc if p not in ("body", "query", "path")]
    return ".".join(parts)


async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    errors = []
    for err in exc.errors():
        code = _TYPE_TO_CODE.get(err.get("type", ""), "invalid")
        errors.append(
            {
                "field": _field_path(err.get("loc", ())),
                "code": code,
                "message": _MESSAGES.get(code, "This value is invalid."),
            }
        )
    return JSONResponse(
        status_code=422,
        content=jsonable_encoder({"detail": "Some fields contain invalid values.", "errors": errors}),
    )
