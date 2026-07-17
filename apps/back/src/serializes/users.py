# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for users referenced from other resources."""

import uuid

from pydantic import field_validator

from src.models.enum import UserGender, UserType
from src.serializes._base import CamelBase
from src.services.files import get_file_storage


class OwnerItem(CamelBase):
    """Denormalised identity of an entity's owner.

    Embedded on every resource that carries an `owner_id`, so the front does not
    have to resolve the owner against `/accounts/{id}/users`. Deliberately email-
    free — this shape is broadcast on many list payloads.
    """

    first_name: str | None = None
    gender: UserGender
    id: uuid.UUID
    last_name: str | None = None
    picture_profile: str | None = None
    type: UserType

    @field_validator("picture_profile", mode="after")
    @classmethod
    def _public_url(cls, value: str | None) -> str | None:
        """Expose a fetchable URL, not the raw storage key.

        `picture_profile` is stored as an opaque storage key on the `User` row;
        `/me` and `/accounts` publish it through the same `url_for` (via their
        managers). Owner is serialized straight from the relationship, so the
        normalisation happens here. `url_for` passes full URLs through, so this
        stays idempotent.
        """
        return get_file_storage().url_for(value) if value else None
