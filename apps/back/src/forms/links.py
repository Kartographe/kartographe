# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Input schemas for links (references attached to an entity)."""

import uuid
from typing import Annotated

from pydantic import AfterValidator, Field

from src.forms._base import CamelBase
from src.models.enum import EntityType, LinkType
from src.utils.links import is_http_url


def _http_url(value: str) -> str:
    """Refuse anything a browser should not be sent to.

    `javascript:`, `data:` and friends would be rendered as clickable anchors in
    the UI, so they are rejected at the edge rather than filtered at display
    time — one check, in the one place every write goes through.
    """
    if not is_http_url(value):
        raise ValueError("URL must be an absolute http:// or https:// address")
    return value


HttpUrl = Annotated[str, AfterValidator(_http_url)]

_URL_DESCRIPTION = (
    "Absolute URL the reference points at (`http`/`https` only). A URL on this "
    "Kartographe instance is resolved into a structured `internal` block on read."
)
_TITLE_DESCRIPTION = (
    "Human label for the reference. Leave it out to show the URL itself; "
    "`api_links_prefill` proposes the target page's title."
)
_DESCRIPTION_DESCRIPTION = "Rich-text note explaining the reference, as a document object."


class LinkCreateForm(CamelBase):
    """Attach a reference to an entity."""

    url: HttpUrl = Field(max_length=2048, description=_URL_DESCRIPTION)
    type: LinkType = Field(default=LinkType.OTHER, description="What the reference points at.")
    title: str | None = Field(default=None, max_length=500, description=_TITLE_DESCRIPTION)
    description: dict | None = Field(default=None, description=_DESCRIPTION_DESCRIPTION)


class LinkAttachForm(LinkCreateForm):
    """Attach a reference to any entity through the account-wide endpoint.

    Same shape as the per-entity form, plus the polymorphic target
    (`entityType` + `entityId`) — validated server-side against the account.
    """

    entity_type: EntityType = Field(description="The kind of entity the reference is attached to.")
    entity_id: uuid.UUID = Field(description="The id of the entity the reference is attached to.")


class LinkPatchForm(CamelBase):
    """Edit a reference. Every field is optional — only those sent are applied.

    `title` and `description` accept `null` to clear them.
    """

    url: HttpUrl | None = Field(default=None, max_length=2048, description=_URL_DESCRIPTION)
    type: LinkType | None = Field(default=None, description="What the reference points at.")
    title: str | None = Field(default=None, max_length=500, description=_TITLE_DESCRIPTION)
    description: dict | None = Field(default=None, description=_DESCRIPTION_DESCRIPTION)


class LinkPrefillForm(CamelBase):
    """Ask the server what a URL looks like, before saving a reference."""

    url: HttpUrl = Field(max_length=2048, description=_URL_DESCRIPTION)
