# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Shared engine behind every `POST .../bulk` route.

A bulk route resolves its shared context once (the account, the parent
resource, the role gate, the manager) exactly like the single-item `POST`, then
hands the list of forms to `bulk_create` together with two small callables: how
to create one item, and how to serialize it. Everything else — per-item
isolation, error capture, the counted envelope — lives here so the routes stay
a few declarative lines.

Per-item isolation leans on the managers' own behaviour: `_persist` commits each
created row immediately, so a well-formed item is already durable before the
next one runs. When an item raises, we roll the session back to clear the failed
unit of work and carry on — the rows committed before it are untouched.
"""

from collections.abc import Callable, Sequence
from typing import TypeVar

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from src.serializes.bulk import BulkCreateResponse, BulkItemError, BulkItemResult

FormT = TypeVar("FormT")
ItemT = TypeVar("ItemT")


def bulk_create(
    session: Session,
    forms: Sequence[FormT],
    *,
    create_one: Callable[[FormT], object],
    serialize: Callable[[object], ItemT],
) -> BulkCreateResponse[ItemT]:
    """Create each form best-effort, returning a per-item outcome envelope.

    `create_one(form)` performs the same work the single-item route does (a
    `manager.create(...)` call, which commits the row). `serialize(entity)`
    turns the created row into its response item (mirror whatever the single
    route returns — no tag/aggregate enrichment unless that route does it too).

    A `create_one` that raises `HTTPException` (business rule: locked parent,
    parent not found, invalid parameters) or `SQLAlchemyError` (constraint
    violation) fails just that item; anything else propagates, since it signals
    a bug rather than a bad input.
    """
    results: list[BulkItemResult[ItemT]] = []
    created = 0
    failed = 0

    for index, form in enumerate(forms):
        try:
            entity = create_one(form)
        except HTTPException as exc:
            session.rollback()
            failed += 1
            results.append(
                BulkItemResult(index=index, status="error", error=BulkItemError(detail=str(exc.detail)))
            )
        except SQLAlchemyError:
            session.rollback()
            failed += 1
            results.append(
                BulkItemResult(
                    index=index,
                    status="error",
                    error=BulkItemError(detail="Could not be created (database constraint violation)."),
                )
            )
        else:
            created += 1
            results.append(BulkItemResult(index=index, status="created", item=serialize(entity)))

    return BulkCreateResponse(results=results, created=created, failed=failed)
