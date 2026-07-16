# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Route lifecycle: creation/update with guard/role/version validation, status
flips and cascading delete."""

import uuid

from fastapi import HTTPException, status
from sqlmodel import select

from src.managers._base import BaseEntityManager
from src.managers.tagging import tag_overlap
from src.models.application import Application
from src.models.application_guard import ApplicationGuard
from src.models.application_role import ApplicationRole
from src.models.application_route import ApplicationRoute
from src.models.application_route_example import ApplicationRouteExample
from src.models.application_route_response import ApplicationRouteResponse
from src.models.application_route_table import ApplicationRouteTable
from src.models.application_version import ApplicationVersion
from src.models.enum import ApplicationRouteMethod, ApplicationRouteStatus
from src.models.journey_scenario_step_route import JourneyScenarioStepRoute
from src.models.user import User
from src.utils.datetime import utc_now


class ApplicationRouteManager(BaseEntityManager):
    def list_for_application(
        self, application: Application, *, tag_ids: list[uuid.UUID] | None = None
    ) -> list[ApplicationRoute]:
        """Every enabled route of the application, most recent first.

        `tag_ids` keeps only the rows carrying at least one of those tags.
        """
        conditions = [ApplicationRoute.application_id == application.id, ApplicationRoute.enabled.is_(True)]
        if tag_ids:
            conditions.append(tag_overlap(ApplicationRoute, tag_ids))
        return list(
            self.session.exec(
                select(ApplicationRoute).where(*conditions).order_by(ApplicationRoute.date.desc())
            ).all()
        )

    # --- validation ------------------------------------------------------

    def _assert_ids_in_application(self, model, application: Application, ids, label: str) -> None:
        if not ids:
            return
        unique = set(ids)
        found = set(
            self.session.exec(
                select(model.id).where(
                    model.application_id == application.id,
                    model.id.in_(unique),
                    model.enabled.is_(True),
                )
            ).all()
        )
        missing = unique - found
        if missing:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                f"{label} not found on this application: {', '.join(str(m) for m in sorted(missing, key=str))}.",
            )

    def _assert_version_in_application(
        self, application: Application, version_id: uuid.UUID | None
    ) -> None:
        if version_id is None:
            return
        version = self.session.get(ApplicationVersion, version_id)
        if version is None or not version.enabled or version.application_id != application.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found on this application.")

    def _validate(self, application: Application, data: dict) -> None:
        if "application_guard_ids" in data:
            self._assert_ids_in_application(
                ApplicationGuard, application, data["application_guard_ids"], "Guard(s)"
            )
        if "application_role_ids" in data:
            self._assert_ids_in_application(
                ApplicationRole, application, data["application_role_ids"], "Role(s)"
            )
        for key in ("start_application_version_id", "end_application_version_id"):
            if data.get(key) is not None:
                self._assert_version_in_application(application, data[key])

    # --- mutations -------------------------------------------------------

    def create(
        self,
        application: Application,
        user: User,
        *,
        method: ApplicationRouteMethod,
        path: str,
        title: str | None,
        description: dict | None,
        application_guard_ids: list[uuid.UUID],
        application_role_ids: list[uuid.UUID],
        start_date,
        start_application_version_id: uuid.UUID | None,
        end_date,
        end_application_version_id: uuid.UUID | None,
        accepted_format: list[str],
        query_params_schema: dict,
        header_schema: dict,
        body_schema: dict,
        raw_schema: dict,
        tag_ids: list[uuid.UUID],
    ) -> ApplicationRoute:
        """Create a draft route owned by `user`, validating its references."""
        self._validate(
            application,
            {
                "application_guard_ids": application_guard_ids,
                "application_role_ids": application_role_ids,
                "start_application_version_id": start_application_version_id,
                "end_application_version_id": end_application_version_id,
            },
        )
        now = utc_now()
        route = ApplicationRoute(
            account_id=application.account_id,
            application_id=application.id,
            owner_id=user.id,
            start_application_version_id=start_application_version_id,
            end_application_version_id=end_application_version_id,
            application_guard_ids=application_guard_ids,
            application_role_ids=application_role_ids,
            date=now,
            status=ApplicationRouteStatus.DRAFT,
            status_date=now,
            start_date=start_date,
            end_date=end_date,
            method=method,
            title=title,
            description=description,
            path=path,
            accepted_format=accepted_format,
            query_params_schema=query_params_schema,
            header_schema=header_schema,
            body_schema=body_schema,
            raw_schema=raw_schema,
            tag_ids=tag_ids,
        )
        return self._persist(route)

    def update(self, application: Application, route: ApplicationRoute, fields: dict) -> ApplicationRoute:
        """Apply a partial update, validating references that change."""
        self._validate(application, fields)
        return self.apply_update(route, fields)

    def soft_delete(self, route: ApplicationRoute) -> None:
        """Soft-delete the route with its responses, examples and table links, and
        detach it from any scenario step that referenced it."""
        now = utc_now()
        self._disable(route, now)
        for model in (ApplicationRouteResponse, ApplicationRouteExample, ApplicationRouteTable):
            self._bulk_disable(model, model.application_route_id == route.id, now=now)
        self._bulk_disable(
            JourneyScenarioStepRoute,
            JourneyScenarioStepRoute.application_route_id == route.id,
            now=now,
        )
        self.session.commit()
