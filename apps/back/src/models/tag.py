# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `tag` table — a colored label attachable to an account's entities.

Each tag targets one kind of entity (`entity_type`); the entities it is attached
to carry its id in their `tag_ids` array.
"""

import uuid

from sqlmodel import Field

from src.models._base import BaseModel
from src.models.enum import TagEntityType


class Tag(BaseModel, table=True):
    __tablename__ = "tag"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)

    entity_type: TagEntityType = Field(index=True)
    label: str
    background_color: str
    text_color: str
