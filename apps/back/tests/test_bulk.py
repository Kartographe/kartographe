# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Unit tests for the shared bulk-create engine and the endpoints it backs.

The engine is pinned independently of the database (like the lock guard): the
contract is *best-effort per item* — a failing item is isolated (its unit of
work rolled back) and reported, while the items around it still succeed. The
OpenAPI checks then lock the wire contract every `POST .../bulk` exposes.
"""

import re

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

from server_api import app
from src.utils.bulk import bulk_create


class _FakeSession:
    """Minimal stand-in: `bulk_create` only ever calls `rollback()`."""

    def __init__(self):
        self.rollbacks = 0

    def rollback(self):
        self.rollbacks += 1


def test_all_items_succeed():
    session = _FakeSession()
    resp = bulk_create(
        session,
        ["a", "b", "c"],
        create_one=lambda form: {"value": form},
        serialize=lambda entity: entity["value"],
    )
    assert (resp.created, resp.failed) == (3, 0)
    assert [r.status for r in resp.results] == ["created", "created", "created"]
    assert [r.item for r in resp.results] == ["a", "b", "c"]
    assert session.rollbacks == 0


def test_business_error_isolates_one_item():
    session = _FakeSession()

    def create_one(form):
        if form == "bad":
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "title too short")
        return {"value": form}

    resp = bulk_create(
        session,
        ["a", "bad", "b"],
        create_one=create_one,
        serialize=lambda entity: entity["value"],
    )
    assert (resp.created, resp.failed) == (2, 1)
    # The good items keep their 0-based index; only the middle one failed.
    assert [(r.index, r.status) for r in resp.results] == [(0, "created"), (1, "error"), (2, "created")]
    assert resp.results[1].error.detail == "title too short"
    assert resp.results[1].item is None
    # Exactly one failed unit of work was rolled back — the good ones were not.
    assert session.rollbacks == 1


def test_database_constraint_is_caught_per_item():
    session = _FakeSession()

    def create_one(form):
        if form == "dupe":
            raise IntegrityError("INSERT ...", params=None, orig=Exception("unique violation"))
        return {"value": form}

    resp = bulk_create(
        session,
        ["dupe", "ok"],
        create_one=create_one,
        serialize=lambda entity: entity["value"],
    )
    assert (resp.created, resp.failed) == (1, 1)
    assert resp.results[0].status == "error"
    assert "constraint" in resp.results[0].error.detail
    assert session.rollbacks == 1


def _bulk_operations() -> dict[str, dict]:
    """Every `POST .../bulk` operation in the live spec, keyed by operation_id."""
    out = {}
    for path, item in app.openapi()["paths"].items():
        if path.endswith("/bulk") and "post" in item:
            out[item["post"]["operationId"]] = item["post"]
    return out


def test_bulk_endpoints_share_the_multistatus_contract():
    ops = _bulk_operations()
    # The rollout covers dozens of create endpoints; guard against a router that
    # silently dropped out of the assembly.
    assert len(ops) >= 30, f"expected the bulk surface to be broad, got {len(ops)}"

    for op_id, op in ops.items():
        assert re.fullmatch(r"api_.+_bulk_create", op_id), f"unexpected bulk operation_id: {op_id}"
        # Served as 207 Multi-Status, never a bare 200/201.
        assert "207" in op["responses"], f"{op_id} does not declare a 207 response"
        resp_ref = op["responses"]["207"]["content"]["application/json"]["schema"]["$ref"]
        assert resp_ref.startswith("#/components/schemas/BulkCreateResponse_"), op_id
        # Body is a size-capped BulkCreateRequest wrapping the single-item form.
        body_ref = op["requestBody"]["content"]["application/json"]["schema"]["$ref"]
        assert body_ref.startswith("#/components/schemas/BulkCreateRequest_"), op_id


def test_bulk_request_is_capped_at_fifty():
    schemas = app.openapi()["components"]["schemas"]
    caps = {
        name: schema["properties"]["items"]["maxItems"]
        for name, schema in schemas.items()
        if name.startswith("BulkCreateRequest_")
    }
    assert caps, "no BulkCreateRequest schema found"
    assert set(caps.values()) == {50}, f"every batch must cap at 50, got {caps}"
