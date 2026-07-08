"""Error response envelopes surfaced in OpenAPI (Scalar / MCP / generated client)."""

from src.serializes._base import CamelBase


class ErrorResponse(CamelBase):
    """A business error: a single human-readable message."""

    detail: str


class FieldError(CamelBase):
    """One invalid field in a validation error."""

    field: str
    code: str
    message: str


class ValidationErrorResponse(CamelBase):
    """A `422` payload: a top-level message plus a per-field breakdown."""

    detail: str
    errors: list[FieldError]
