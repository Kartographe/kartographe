# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Query parameters for the application-components listings."""

from enum import Enum


class ApplicationComponentSortField(str, Enum):
    """Sortable columns for the components listings."""

    DATE = "date"
    TITLE = "title"
    STATUS = "status"
    TYPE = "type"
