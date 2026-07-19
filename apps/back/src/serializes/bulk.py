# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Response envelope for the bulk-create endpoints (`POST .../bulk`).

Bulk creation is **best-effort per item**: each element is persisted in its own
transaction, so a runtime failure on one (a locked parent, a foreign-key
violation, an invalid parameter set) rejects only that element — the others
still land. The response therefore reports a per-item outcome rather than a
single success/failure, so an MCP agent knows exactly which inputs to retry.

Note the one thing this envelope does *not* cover: a **schema-invalid** item
(wrong type, missing required field) is caught by FastAPI's request validation
*before* the handler runs, so the whole batch returns a standard `422` whose
error path points at the offending index (`body.items.2.title`). Only errors
raised while *creating* a well-formed item surface here.
"""

from typing import Generic, Literal, TypeVar

from src.serializes._base import CamelBase

T = TypeVar("T")


class BulkItemError(CamelBase):
    """Why a single item failed to be created."""

    detail: str


class BulkItemResult(CamelBase, Generic[T]):
    """Outcome of one item in a bulk-create batch.

    `status` is `created` (then `item` is the resource, `error` is null) or
    `error` (then `error` carries the reason, `item` is null). `index` is the
    item's 0-based position in the submitted `items` array, so the caller can
    map an outcome back to the input it sent.
    """

    index: int
    status: Literal["created", "error"]
    item: T | None = None
    error: BulkItemError | None = None


class BulkCreateResponse(CamelBase, Generic[T]):
    """Envelope returned by every `POST .../bulk` endpoint.

    Always served with HTTP `207 Multi-Status`, even when every item succeeded:
    read `created` / `failed` (or scan `results[].status`) to know the outcome
    rather than relying on the status code.
    """

    results: list[BulkItemResult[T]]
    created: int
    failed: int
