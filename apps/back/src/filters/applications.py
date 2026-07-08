"""Query parameters for `GET /v1/accounts/{account_id}/applications`."""

from enum import Enum


class ApplicationSortField(str, Enum):
    """Sortable columns for the applications listing."""

    DATE = "date"
    TITLE = "title"
    STATUS = "status"
    TYPE = "type"
