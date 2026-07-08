import uuid

from fastapi import APIRouter, status

from src.serializes._base import ListingResponse
from src.serializes.errors import ErrorResponse
from src.serializes.me_mcp import MeMCPGrantItem
from src.utils.dependencies import CurrentUserDep, MeMCPManagerDep

router = APIRouter(prefix="/me/mcp", tags=["api.me.mcp"])


@router.get(
    "/grants",
    operation_id="api.me.mcp.grants.list",
    summary="List connected MCP applications",
    description="List the applications with an active grant on the account.",
    response_model=ListingResponse[MeMCPGrantItem],
)
def list_grants(user: CurrentUserDep, manager: MeMCPManagerDep) -> ListingResponse[MeMCPGrantItem]:
    grants = manager.list_for_user(user)
    items = [
        MeMCPGrantItem(
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
    operation_id="api.me.mcp.grants.revoke",
    summary="Revoke a connected application",
    description="Revoke the grant, immediately invalidating the application's tokens.",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: {"model": ErrorResponse, "description": "Not found"}},
)
def revoke_grant(grant_id: uuid.UUID, user: CurrentUserDep, manager: MeMCPManagerDep) -> None:
    grant = manager.get_owned_grant(user, grant_id)
    manager.revoke_grant(grant)
