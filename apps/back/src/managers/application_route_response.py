# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Route response lifecycle: listing, creation, update and delete.

Deleting a response also soft-deletes the examples that reference it (an example
always points at a response).
"""

from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.application_route import ApplicationRoute
from src.models.application_route_example import ApplicationRouteExample
from src.models.application_route_response import ApplicationRouteResponse
from src.models.enum import ApplicationRouteResponseFormat
from src.utils.datetime import utc_now


class ApplicationRouteResponseManager(BaseEntityManager):
    def list_for_route(self, route: ApplicationRoute) -> list[ApplicationRouteResponse]:
        """Every enabled response of the route, in insertion order."""
        return list(
            self.session.exec(
                select(ApplicationRouteResponse)
                .where(
                    ApplicationRouteResponse.application_route_id == route.id,
                    ApplicationRouteResponse.enabled.is_(True),
                )
                .order_by(ApplicationRouteResponse.created_at.asc())
            ).all()
        )

    def create(
        self,
        route: ApplicationRoute,
        *,
        status_code: int,
        format: ApplicationRouteResponseFormat,
        body_schema: dict,
    ) -> ApplicationRouteResponse:
        """Create a documented response of the route."""
        response = ApplicationRouteResponse(
            account_id=route.account_id,
            application_id=route.application_id,
            application_route_id=route.id,
            status_code=status_code,
            format=format,
            body_schema=body_schema,
        )
        return self._persist(response)

    def soft_delete(self, response: ApplicationRouteResponse) -> None:
        """Soft-delete the response and the examples that reference it."""
        now = utc_now()
        self._disable(response, now)
        self._bulk_disable(
            ApplicationRouteExample,
            ApplicationRouteExample.application_route_response_id == response.id,
            now=now,
        )
        self.session.commit()
