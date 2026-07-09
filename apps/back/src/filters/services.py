"""Query parameters for `GET /v1/accounts/{account_id}/services`."""

from enum import Enum


class ServiceSortField(str, Enum):
    """Sortable columns for the services listing."""

    DATE = "date"
    TITLE = "title"
    STATUS = "status"
    TYPE = "type"
