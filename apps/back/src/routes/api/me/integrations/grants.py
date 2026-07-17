# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

import uuid

from fastapi import APIRouter, status

from src.serializes._base import ListingResponse
from src.serializes.errors import ErrorResponse
from src.serializes.me_integrations import MeIntegrationGrantItem
from src.utils.dependencies import CurrentUserDep, MeIntegrationsManagerDep

router = APIRouter(prefix="/me/integrations", tags=["api.me.integrations"])


@router.get(
    "/grants",
    operation_id="api_me_integrations_grants_list",
    summary="List connected integrations",
    description="List the integrations with an active grant on the account.",
    response_model=ListingResponse[MeIntegrationGrantItem],
)
def list_grants(user: CurrentUserDep, manager: MeIntegrationsManagerDep) -> ListingResponse[MeIntegrationGrantItem]:
    grants = manager.list_for_user(user)
    items = [
        MeIntegrationGrantItem(
            id=grant.id,
            client_id=grant.client_id,
            client_name=grant.client.name,
            scope=grant.scope,
            connected_at=grant.created_at,
            last_used_at=grant.last_used_at,
        )
        for grant in grants
    ]
    return ListingResponse.single_page(items)


@router.delete(
    "/grants/{grant_id}",
    operation_id="api_me_integrations_grants_revoke",
    summary="Revoke a connected integration",
    description="Revoke the grant, immediately invalidating the integration's tokens.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: {"model": ErrorResponse, "description": "Not found"}},
)
def revoke_grant(grant_id: uuid.UUID, user: CurrentUserDep, manager: MeIntegrationsManagerDep) -> None:
    grant = manager.get_owned_grant(user, grant_id)
    manager.revoke_grant(grant)
