# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""`/v1/accounts/{account_id}/features` — account-level features.

Reads are open to any account member; writes are open to every contributing
role (everyone except commentators). Deleting a feature cascades a soft-delete
to its attached files and its application links.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.filters._base import MyVoteFilter, PageLimit, SortOrder
from src.filters.features import FeatureSortField
from src.forms._bulk import BulkCreateRequest
from src.forms.features import FeatureCreateForm, FeaturePatchForm
from src.models.account_user import AccountUser
from src.models.enum import AccountUserRole, EntityType, FeatureStatus, FeatureType
from src.serializes._base import ItemResponse, ListingResponse
from src.serializes.bulk import BulkCreateResponse
from src.serializes.features import FeatureItem
from src.serializes.errors import ErrorResponse
from src.utils.bulk import bulk_create
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
    operation_id="api_features_list",
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
    member: CurrentAccountUserDep,
    manager: FeatureManagerDep,
    tags: TagManagerDep,
    feature_status: Annotated[list[FeatureStatus] | None, Query(alias="status")] = None,
    type: Annotated[list[FeatureType] | None, Query(alias="type")] = None,
    tag_ids: Annotated[list[uuid.UUID] | None, Query(alias="tagIds")] = None,
    my_vote: MyVoteFilter = None,
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
        my_vote=my_vote,
        user_id=member.user_id,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit.value,
    )
    items = tags.enrich(EntityType.FEATURE, tags.attach(rows, FeatureItem), user_id=member.user_id)
    return ListingResponse.paginate(items, count=total, page=page, limit=limit.value)


@router.post(
    "",
    operation_id="api_features_create",
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


@router.post(
    "/bulk",
    operation_id="api_features_bulk_create",
    summary="Create several features at once",
    description=(
        "Create 1 to 50 features in a single call — prefer this over calling "
        "`api_features_create` in a loop when adding many. Best-effort: each feature is "
        "created independently, so one failing item does not roll back the others. Always "
        "returns 207; read each `results[].status` (`created`/`error`) and the `created` / "
        "`failed` counts rather than the HTTP code. Each item takes the same shape as the "
        "single create. Every contributing role may create features."
    ),
    response_model=BulkCreateResponse[FeatureItem],
    status_code=status.HTTP_207_MULTI_STATUS,
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def bulk_create_features(
    body: BulkCreateRequest[FeatureCreateForm],
    account: CurrentAccountDep,
    user: CurrentUserDep,
    manager: FeatureManagerDep,
    _: Annotated[AccountUser, Depends(_CONTRIBUTOR)],
) -> BulkCreateResponse[FeatureItem]:
    return bulk_create(
        manager.session,
        body.items,
        create_one=lambda form: manager.create(
            account, user, title=form.title, description=form.description, type=form.type, tag_ids=form.tag_ids
        ),
        serialize=FeatureItem.model_validate,
    )


@router.get(
    "/{feature_id}",
    operation_id="api_features_get",
    summary="Get a feature",
    description="Return a single feature of the account. Any member may read.",
    response_model=ItemResponse[FeatureItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def get_feature(
    _: CurrentAccountUserDep, feature: CurrentFeatureDep, tags: TagManagerDep
) -> ItemResponse[FeatureItem]:
    return ItemResponse(item=tags.enrich_one(EntityType.FEATURE, tags.attach_one(feature, FeatureItem)))


@router.patch(
    "/{feature_id}",
    operation_id="api_features_update",
    summary="Update a feature",
    description=(
        "Partially update a feature (title, description, type, status). "
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


@router.delete(
    "/{feature_id}",
    operation_id="api_features_delete",
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


_LOCK_ADMIN = require_role(AccountUserRole.OWNER, AccountUserRole.ADMINISTRATOR)


@router.post(
    "/{feature_id}/lock",
    operation_id="api_features_lock",
    summary="Lock a feature",
    description=(
        "Freeze the feature against edits and deletion; comments, votes and child "
        "entities stay available. Owners and administrators only."
    ),
    response_model=ItemResponse[FeatureItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def lock_feature(
    entity: CurrentFeatureDep,
    user: CurrentUserDep,
    manager: FeatureManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[FeatureItem]:
    return ItemResponse(item=FeatureItem.model_validate(manager.lock(entity, user)))


@router.post(
    "/{feature_id}/unlock",
    operation_id="api_features_unlock",
    summary="Unlock a feature",
    description="Lift the freeze on the feature. Owners and administrators only.",
    response_model=ItemResponse[FeatureItem],
    responses={**_FORBIDDEN, **_NOT_FOUND},
)
def unlock_feature(
    entity: CurrentFeatureDep,
    manager: FeatureManagerDep,
    _: Annotated[AccountUser, Depends(_LOCK_ADMIN)],
) -> ItemResponse[FeatureItem]:
    return ItemResponse(item=FeatureItem.model_validate(manager.unlock(entity)))
