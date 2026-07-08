"""Input schema for the SPA MCP consent endpoints (camelCase)."""

from src.forms._base import CamelBase
from src.models.enum import McpGrantScope


class MeMCPAuthorizeApproveForm(CamelBase):
    scope: McpGrantScope
