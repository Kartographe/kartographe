# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Query parameters for `GET /v1/accounts/{account_id}/personas`."""

from enum import Enum


class PersonaSortField(str, Enum):
    """Sortable columns for the personas listing."""

    DATE = "date"
    TITLE = "title"
    STATUS = "status"
    TYPE = "type"
