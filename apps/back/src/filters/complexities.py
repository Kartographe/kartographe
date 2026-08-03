# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Query parameters for `GET /v1/accounts/{account_id}/complexities`."""

from enum import Enum


class ComplexitySortField(str, Enum):
    """Sortable columns for the complexities listing."""

    DATE = "date"
    VALUE = "value"
    MODE = "mode"
