# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Query parameters for the application bounded-context listings."""

from enum import Enum


class ApplicationBoundedContextSortField(str, Enum):
    """Sortable columns for the bounded-context listings."""

    DATE = "date"
    TITLE = "title"
