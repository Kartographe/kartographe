# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The `application_feature` table — a feature tracked on an application.

Junction between an `Application` and an account-level `Feature`, carrying the
window during which the feature is present on the application: the version it
was introduced in (`start_*`) and the one it was removed in (`end_*`), both
optional (a feature may be planned but not yet shipped, or still live).
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship

from src.models._base import BaseModel

if TYPE_CHECKING:
    from src.models.user import User


class ApplicationFeature(BaseModel, table=True):
    __tablename__ = "application_feature"

    account_id: uuid.UUID = Field(foreign_key="account.id", index=True)
    application_id: uuid.UUID = Field(foreign_key="application.id", index=True)
    feature_id: uuid.UUID = Field(foreign_key="feature.id", index=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True)

    date: datetime
    start_date: datetime | None = Field(default=None)
    start_application_version_id: uuid.UUID | None = Field(
        default=None, foreign_key="application_version.id", index=True
    )
    end_date: datetime | None = Field(default=None)
    end_application_version_id: uuid.UUID | None = Field(
        default=None, foreign_key="application_version.id", index=True
    )

    owner: "User" = Relationship()
