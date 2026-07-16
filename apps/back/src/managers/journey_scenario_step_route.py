# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Step ↔ route link lifecycle: creation with validation, delete."""

import uuid

from fastapi import HTTPException, status
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.models.application import Application
from src.models.application_route import ApplicationRoute
from src.models.journey_scenario_step import JourneyScenarioStep
from src.models.journey_scenario_step_route import JourneyScenarioStepRoute
from src.models.user import User
from src.utils.datetime import utc_now


class JourneyScenarioStepRouteManager(BaseEntityManager):
    def list_for_step(self, step: JourneyScenarioStep) -> list[JourneyScenarioStepRoute]:
        """Every enabled route link of the step, most recent first."""
        return list(
            self.session.exec(
                select(JourneyScenarioStepRoute)
                .where(
                    JourneyScenarioStepRoute.journey_scenario_step_id == step.id,
                    JourneyScenarioStepRoute.enabled.is_(True),
                )
                .order_by(JourneyScenarioStepRoute.date.desc())
            ).all()
        )

    def resolve_route(
        self, step: JourneyScenarioStep, application_id: uuid.UUID, application_route_id: uuid.UUID
    ) -> ApplicationRoute:
        """Load the route to link, ensuring its application belongs to the account
        and the route belongs to that application."""
        application = self.session.get(Application, application_id)
        if application is None or not application.enabled or application.account_id != step.account_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found in this account.")
        route = self.session.get(ApplicationRoute, application_route_id)
        if route is None or not route.enabled or route.application_id != application_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Route not found on this application.")
        return route

    def create(
        self, step: JourneyScenarioStep, user: User, route: ApplicationRoute
    ) -> JourneyScenarioStepRoute:
        """Link `route` to `step`."""
        link = JourneyScenarioStepRoute(
            account_id=step.account_id,
            journey_id=step.journey_id,
            journey_scenario_id=step.journey_scenario_id,
            journey_scenario_step_id=step.id,
            application_id=route.application_id,
            application_route_id=route.id,
            owner_id=user.id,
            date=utc_now(),
        )
        return self._persist(link)

    def soft_delete(self, link: JourneyScenarioStepRoute) -> None:
        now = utc_now()
        self._disable(link, now)
        self.session.commit()
