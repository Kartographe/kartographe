# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for users referenced from other resources."""

import uuid

from src.models.enum import UserGender, UserType
from src.serializes._base import CamelBase


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
