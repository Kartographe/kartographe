# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for comments."""

from pydantic import Field

from src.forms._base import CamelBase


class CommentCreateForm(CamelBase):
    """Post a comment (or a reply). `value` is rich-text content."""

    value: dict = Field(description="Rich-text content as a document object.")


class CommentPatchForm(CamelBase):
    """Edit a comment's content."""

    value: dict = Field(description="Rich-text content as a document object.")
