"""Route example lifecycle: creation/update with response validation, delete."""

import uuid

from fastapi import HTTPException, status
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.application_route import ApplicationRoute
from src.models.application_route_example import ApplicationRouteExample
from src.models.application_route_response import ApplicationRouteResponse
from src.utils.datetime import utc_now


class ApplicationRouteExampleManager(BaseEntityManager):
    def list_for_route(self, route: ApplicationRoute) -> list[ApplicationRouteExample]:
        """Every enabled example of the route, in insertion order."""
        return list(
            self.session.exec(
                select(ApplicationRouteExample)
                .where(
                    ApplicationRouteExample.application_route_id == route.id,
                    ApplicationRouteExample.enabled.is_(True),
                )
                .order_by(ApplicationRouteExample.created_at.asc())
            ).all()
        )

    def _assert_response_on_route(
        self, route: ApplicationRoute, response_id: uuid.UUID
    ) -> None:
        response = self.session.get(ApplicationRouteResponse, response_id)
        if response is None or not response.enabled or response.application_route_id != route.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Response not found on this route.")

    def create(
        self,
        route: ApplicationRoute,
        *,
        application_route_response_id: uuid.UUID,
        query_params: dict,
        headers: dict,
        body: dict,
        raw: dict,
        response: dict,
    ) -> ApplicationRouteExample:
        """Create an example, validating that the response belongs to the route."""
        self._assert_response_on_route(route, application_route_response_id)
        example = ApplicationRouteExample(
            account_id=route.account_id,
            application_id=route.application_id,
            application_route_id=route.id,
            application_route_response_id=application_route_response_id,
            query_params=query_params,
            headers=headers,
            body=body,
            raw=raw,
            response=response,
        )
        return self._persist(example)

    def update(
        self, route: ApplicationRoute, example: ApplicationRouteExample, fields: dict
    ) -> ApplicationRouteExample:
        """Apply a partial update, validating the response reference when it changes."""
        if fields.get("application_route_response_id") is not None:
            self._assert_response_on_route(route, fields["application_route_response_id"])
        return self.apply_update(example, fields)

    def soft_delete(self, example: ApplicationRouteExample) -> None:
        now = utc_now()
        self._disable(example, now)
        self.session.commit()
