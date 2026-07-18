# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Query parameters for `GET /v1/accounts/{account_id}/scenarios`."""

from enum import Enum


class JourneyScenarioSortField(str, Enum):
    """Sortable columns for the account-wide scenarios listing."""

    DATE = "date"
    TITLE = "title"
    STATUS = "status"
    TYPE = "type"
    CRITICITY = "criticity"
