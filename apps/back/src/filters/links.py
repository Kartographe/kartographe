# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Query parameters for `GET /v1/accounts/{account_id}/links`."""

from enum import Enum


class LinkSortField(str, Enum):
    """Sortable columns for the links listing."""

    DATE = "date"
    TITLE = "title"
    TYPE = "type"
