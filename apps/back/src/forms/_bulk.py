# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Request wrapper for the bulk-create endpoints (`POST .../bulk`).

`BulkCreateRequest[SomeCreateForm]` wraps the very same create form each
single-item `POST` already accepts, so the tool schema an MCP agent reads keeps
the full per-field shape (types, constraints, examples) — the list is just
capped in size. See `src/serializes/bulk.py` for the matching response.
"""

from typing import Generic, TypeVar

from pydantic import Field

from src.forms._base import CamelBase

# Hard cap on a single batch. Writes are heavier than reads and each item runs
# in its own transaction, so this bounds the wall-clock and connection hold time
# of one request. An agent with more than this splits into several calls.
BULK_MAX_ITEMS = 50

FormT = TypeVar("FormT")


class BulkCreateRequest(CamelBase, Generic[FormT]):
    """Body of a bulk-create call: `{ "items": [ <create form>, … ] }`."""

    items: list[FormT] = Field(
        min_length=1,
        max_length=BULK_MAX_ITEMS,
        description=(
            f"The items to create, 1 to {BULK_MAX_ITEMS} per call. Each entry has "
            "the exact shape of the single-item create body. Items are created "
            "independently: a runtime failure on one does not roll back the others "
            "(see the response `results`)."
        ),
    )
