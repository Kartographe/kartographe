# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

import re

from server_api import app

# `fastapi-mcp` names each MCP tool after its `operation_id`, and MCP clients
# validate every name against this pattern. Claude does not skip an offending
# tool — it refuses the whole server when it is added, so one bad name costs
# the entire tool surface. The `.` of a dotted id is not in the allowed set.
MCP_TOOL_NAME_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")


def _operation_ids() -> list[str]:
    return [
        operation["operationId"]
        for path_item in app.openapi()["paths"].values()
        for method, operation in path_item.items()
        if method in {"get", "post", "put", "patch", "delete"} and "operationId" in operation
    ]


def test_every_operation_id_is_a_usable_mcp_tool_name():
    invalid = [op_id for op_id in _operation_ids() if not MCP_TOOL_NAME_PATTERN.match(op_id)]
    assert not invalid, f"operation_ids MCP clients will reject (use api_feature_action): {sorted(invalid)}"


def test_operation_ids_are_unique():
    # Two routes sharing an id collide as one tool name: the second silently
    # shadows the first and one of the two becomes uncallable.
    op_ids = _operation_ids()
    duplicates = sorted({op_id for op_id in op_ids if op_ids.count(op_id) > 1})
    assert not duplicates, f"operation_id used by more than one route: {duplicates}"
