"""Query parameters for `GET /v1/accounts`."""

from enum import Enum


class AccountSortField(str, Enum):
    """Sortable columns for the accounts listing."""

    NAME = "name"
    CREATED_DATE = "created_date"
    STATUS = "status"
    ROLE = "role"
