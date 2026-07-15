"""Input schema for the SPA OAuth consent endpoints (camelCase)."""

from src.forms._base import CamelBase
from src.models.enum import OauthGrantScope


class MeIntegrationAuthorizeApproveForm(CamelBase):
    scope: OauthGrantScope
