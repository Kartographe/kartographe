# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Query parameters for `GET /v1/accounts/{account_id}/comments`."""

from enum import Enum


class CommentSortField(str, Enum):
    """Sortable columns for the comments listing."""

    DATE = "date"
    STATUS = "status"
    STATUS_DATE = "status_date"
