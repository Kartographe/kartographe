# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `feature_file` table — a file attached to a feature (screenshot, …)."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON
from sqlmodel import Field, Relationship

from src.models._base import BaseModel
from src.models.enum import FeatureFileStatus, FeatureFileType

if TYPE_CHECKING:
    from src.models.user import User


class FeatureFile(BaseModel, table=True):
    __tablename__ = "feature_file"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    # Optional: the upload route is scoped to a feature, not an application.
    application_id: uuid.UUID | None = Field(default=None, foreign_key="application.id", index=True)
    feature_id: uuid.UUID = Field(foreign_key="feature.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    type: FeatureFileType = Field(index=True)
    status: FeatureFileStatus = Field(index=True)
    status_date: datetime
    name: str
    # Rich-text (Tiptap JSON document), optional.
    description: dict | None = Field(default=None, sa_type=JSON)
    file_name: str
    file_size: int
    file_extension: str
    file_path: str

    owner: "User" = Relationship()
