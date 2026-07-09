"""`/v1/accounts/{account_id}/features` — account-level features.

Reads are open to any account member; writes are open to every contributing
role (everyone except commentators). Deleting a feature cascades a soft-delete
to its attached files and its application links.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.filters._base import PageLimit, SortOrder
from src.filters.features import FeatureSortField
from src.forms.features import FeatureCreateForm, FeaturePatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, FeatureStatus, FeatureType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.features import FeatureItem
from src.serializes.errors import ErrorResponse
from src.utils.dependencies import (
    CurrentAccountDep,
    CurrentAccountUserDep,
    CurrentFeatureDep,
    CurrentUserDep,
    FeatureManagerDep,
    TagManagerDep,
)
from src.utils.middlewares import require_role

router = APIRouter(prefix="/accounts/{account_id}/features", tags=["api.features"])

_FORBIDDEN = {403: {"model": ErrorResponse, "description": "Insufficient permissions on this account"}}
_NOT_FOUND = {404: {"model": ErrorResponse, "description": "Account or feature not found"}}

_CONTRIBUTOR = require_role(
    AccountUserRole.OWNER,
    AccountUserRole.ADMINISTRATOR,
    AccountUserRole.LEAD_DEVELOPER,
    AccountUserRole.PRODUCT_OWNER,
    AccountUserRole.QA_MANAGER,
    AccountUserRole.DEVELOPER,
    AccountUserRole.DATA_ANALYST,
)


@router.get(
    "",
    operation_id="api.features.list",
    summary="List features",
    description=(
        "List the features of the account. Filter by status and/or type (repeat the query param "
        "for multiple values), sort by date/title/status/type, and page through results. "
        "Any member may read. "
        "Filter with `tagIds` (repeat the query param) to keep only the entities carrying at least one of those tags. "
    ),
    response_model=ListingResponse[FeatureItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def list_features(
    account: CurrentAccountDep,
    _: CurrentAccountUserDep,
    manager: FeatureManagerDep,
    tags: TagManagerDep,
    feature_status: Annotated[list[FeatureStatus] | None, Query(alias="status")] = None,
    type: Annotated[list[FeatureType] | None, Query(alias="type")] = None,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
    sort_by: Annotated[FeatureSortField, Query(alias="sortBy")] = FeatureSortField.DATE,
    sort_order: Annotated[SortOrder, Query(alias="sortOrder")] = SortOrder.DESC,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[PageLimit, Query()] = PageLimit.L25,
) -> ListingResponse[FeatureItem]:
    rows, total = manager.list_for_account(
        account,
        statuses=feature_status,
        types=type,
        tag_ids=tag_ids,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit.value,
    )
    items = tags.attach(rows, FeatureItem)
    return ListingResponse.paginate(items, count=total, page=page, limit=limit.value)


@router.post(
    "",
    operation_id="api.features.create",
    summary="Create a feature",
    description=(
        "Create a feature. It starts as a draft owned by the caller. "
        "Every contributing role may create features."
    ),
    response_model=ItemResponse[FeatureItem],
    status_code=status.HTTP_201_CREATED,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def create_feature(
    form: FeatureCreateForm,
    account: CurrentAccountDep,
    user: CurrentUserDep,
    manager: FeatureManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> ItemResponse[FeatureItem]:
    feature = manager.create(
        account, user, title=form.title, description=form.description, type=form.type, tag_ids=form.tag_ids
    )
    return ItemResponse(item=FeatureItem.model_validate(feature))


@router.get(
    "/{feature_id}",
    operation_id="api.features.get",
    summary="Get a feature",
    description="Return a single feature of the account. Any member may read.",
    response_model=ItemResponse[FeatureItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_feature(
    _: CurrentAccountUserDep, feature: CurrentFeatureDep, tags: TagManagerDep
) -> ItemResponse[FeatureItem]:
    return ItemResponse(item=tags.attach_one(feature, FeatureItem))


@router.patch(
    "/{feature_id}",
    operation_id="api.features.update",
    summary="Update a feature",
    description=(
        "Partially update a feature (title, description, type). "
        "Every contributing role may edit features."
    ),
    response_model=ItemResponse[FeatureItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def update_feature(
    form: FeaturePatchForm,
    feature: CurrentFeatureDep,
    manager: FeatureManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> ItemResponse[FeatureItem]:
    updated = manager.apply_update(feature, form.model_dump(exclude_unset=True))
    return ItemResponse(item=FeatureItem.model_validate(updated))


@router.post(
    "/{feature_id}/activate",
    operation_id="api.features.activate",
    summary="Activate a feature",
    description="Set the feature status to active. Every contributing role may do this.",
    response_model=ItemResponse[FeatureItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def activate_feature(
    feature: CurrentFeatureDep,
    manager: FeatureManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> ItemResponse[FeatureItem]:
    updated = manager.set_status(feature, FeatureStatus.ACTIVE)
    return ItemResponse(item=FeatureItem.model_validate(updated))


@router.post(
    "/{feature_id}/archive",
    operation_id="api.features.archive",
    summary="Archive a feature",
    description="Set the feature status to archived. Every contributing role may do this.",
    response_model=ItemResponse[FeatureItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def archive_feature(
    feature: CurrentFeatureDep,
    manager: FeatureManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> ItemResponse[FeatureItem]:
    updated = manager.set_status(feature, FeatureStatus.ARCHIVED)
    return ItemResponse(item=FeatureItem.model_validate(updated))


@router.delete(
    "/{feature_id}",
    operation_id="api.features.delete",
    summary="Delete a feature",
    description=(
        "Soft-delete a feature; its files and application links are soft-deleted as well. "
        "Every contributing role may delete features."
    ),
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def delete_feature(
    feature: CurrentFeatureDep,
    manager: FeatureManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> None:
    manager.soft_delete(feature)
