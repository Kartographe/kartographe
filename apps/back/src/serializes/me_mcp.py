"""Output schemas for the SPA-facing MCP consent / grants endpoints (camelCase)."""

import uuid
from datetime import datetime

from src.models.enum import McpAuthorizationFlowType, McpGrantScope
from src.serializes._base import CamelBase


class MeMCPAuthorizationRequestItem(CamelBase):
    """A pending authorization shown on the consent screen."""

    client_name: str
    expires_at: datetime
    flow_type: McpAuthorizationFlowType
    id: uuid.UUID
    redirect_uri: str | None = None
    requested_scope: McpGrantScope
    state: str | None = None


class MeMCPGrantItem(CamelBase):
    """An active grant shown in the account's connected-applications list."""

    client_id: uuid.UUID
    client_name: str
    connected_at: datetime | None = None
    id: uuid.UUID
    last_used_at: datetime | None = None
    scope: McpGrantScope


class MeMCPAuthorizeResponse(CamelBase):
    """Result of approving/denying a request: a redirect URL for the auth-code
    flow, or null for the device flow (which shows in-page success)."""

    redirect_url: str | None = None
