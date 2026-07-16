# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Response model for the `/health` ops probe."""

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    """Body of `GET /health` — liveness probe payload.

    Intended for monitoring tooling (uptime checks, load balancer health
    probes, deploy pipelines). Not part of the integrator surface.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "ok",
                "version": "0.1.0",
                "environment": "production",
            },
        },
    )

    status: str = Field(
        description="Liveness status — always `ok` when the process is responding.",
        examples=["ok"],
    )
    version: str = Field(
        description="Currently deployed service semver.",
        examples=["0.1.0"],
    )
    environment: str = Field(
        description="Deployment environment — `local`, `staging` or `production`.",
        examples=["production"],
    )


__all__ = ["HealthResponse"]
