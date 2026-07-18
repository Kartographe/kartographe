# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Query parameters for `GET /v1/accounts/{account_id}/votes`."""

from enum import Enum


class VoteSortField(str, Enum):
    """Sortable columns for the votes listing."""

    DATE = "date"
    VALUE = "value"
    ROLE = "role"
