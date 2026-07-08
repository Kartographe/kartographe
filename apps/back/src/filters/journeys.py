"""Query parameters for `GET /v1/accounts/{account_id}/journeys`."""

from enum import Enum


class JourneySortField(str, Enum):
    """Sortable columns for the journeys listing."""

    DATE = "date"
    TITLE = "title"
    STATUS = "status"
    TYPE = "type"
