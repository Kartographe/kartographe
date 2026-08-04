# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Output schemas for links (references attached to an entity)."""

import uuid
from datetime import datetime

from src.models.enum import EntityType, LinkType
from src.serializes._base import CamelBase
from src.serializes.entities import EntityRef
from src.serializes.users import OwnerItem


class LinkInternalRef(CamelBase):
    """What a URL pointing back at this instance actually targets.

    Only filled when the URL resolves to an entity of an account the caller is a
    member of — otherwise the link stays an opaque URL, so a reference can never
    be used to probe for entities the reader may not see.
    """

    account_id: uuid.UUID
    entity: EntityRef
    # In-app path (no host), so the front can route client-side instead of
    # reloading the SPA through the absolute URL.
    path: str


class LinkMeta(CamelBase):
    """Facts derived from the URL at read time — never stored on the row.

    `host` is what to show as the source ("linear.app"); `internal` is the
    resolved pointer when the URL leads back into Kartographe.
    """

    host: str | None = None
    internal: LinkInternalRef | None = None


class LinkItem(CamelBase):
    """A reference attached to an account entity."""

    date: datetime
    description: dict | None = None
    entity_id: uuid.UUID
    entity_type: EntityType
    id: uuid.UUID
    meta: LinkMeta = LinkMeta()
    owner: OwnerItem
    owner_id: uuid.UUID
    title: str | None = None
    type: LinkType
    url: str


class LinkListItem(LinkItem):
    """A reference enriched with the entity it is attached to.

    `entity` is null when the target has been soft-deleted — the reference still
    exists, the entity it documented no longer does.
    """

    entity: EntityRef | None = None


class LinkPrefillItem(CamelBase):
    """What the server could tell about a URL before the reference is saved.

    `title` is the target page's title (or the internal entity's label); `type`
    is a suggestion the client is free to override. Both are null/`other` when
    the page could not be read — prefilling never fails the request.
    """

    meta: LinkMeta = LinkMeta()
    title: str | None = None
    type: LinkType = LinkType.OTHER
    url: str
