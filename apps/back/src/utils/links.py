# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Reading a URL: is it ours, and what does it point at?

A reference stores nothing but its URL. When that URL leads back into this very
instance, the API resolves it into a structured pointer so the front can render
the target entity instead of an opaque address. The mapping lives here — it is
the front's route table, read backwards.

Pure functions: no DB, no network. Whether the caller may *see* the resolved
entity is decided later, by the manager.
"""

import uuid
from dataclasses import dataclass
from urllib.parse import urlsplit

from src.models.enum import EntityType
from src.settings import get_settings

# The SPA's `/accounts/$accountId/…` route table, read backwards: the path
# segment that introduces an id, and the kind of entity that id names. Segments
# absent from this map (`versions`, `comments`, `complexity`, …) are skipped —
# either they name something with no polymorphic entity type, or they are a tab
# rather than an entity.
_SEGMENT_TYPES: dict[str, EntityType] = {
    "applications": EntityType.APPLICATION,
    "databases": EntityType.DATABASE,
    "features": EntityType.FEATURE,
    "journeys": EntityType.JOURNEY,
    "migrations": EntityType.DATABASE_MIGRATION,
    "personas": EntityType.PERSONA,
    "scenarios": EntityType.JOURNEY_SCENARIO,
    "services": EntityType.SERVICE,
}

_DEFAULT_PORTS = {"http": "80", "https": "443"}


@dataclass(frozen=True)
class InternalTarget:
    """An entity of this instance, named by a URL."""

    account_id: uuid.UUID
    entity_type: EntityType
    entity_id: uuid.UUID
    # The in-app path (no scheme, no host), so the front routes client-side.
    path: str


def host_of(url: str) -> str | None:
    """The URL's hostname, for display ("linear.app"). None when unparseable."""
    try:
        return urlsplit(url).hostname
    except ValueError:
        return None


def is_http_url(url: str) -> bool:
    """Whether the URL is an absolute `http`/`https` address.

    Everything else (`javascript:`, `file:`, `mailto:`, a bare path) is refused
    up front: a reference is meant to be followed from a browser.
    """
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    return parts.scheme in {"http", "https"} and bool(parts.hostname)


def _authority(url: str) -> tuple[str, str] | None:
    """(host, port) of a URL, with the scheme's default port made explicit."""
    try:
        parts = urlsplit(url)
    except ValueError:
        return None
    if not parts.hostname:
        return None
    port = str(parts.port) if parts.port else _DEFAULT_PORTS.get(parts.scheme, "")
    return parts.hostname.lower(), port


def parse_internal_url(url: str) -> InternalTarget | None:
    """Resolve a URL on this instance into the entity it names.

    Returns None for any URL that is not ours, or that is ours but names no
    entity (the account home, a listing, an unknown route). The *deepest*
    recognized `<segment>/<uuid>` pair wins, so
    `/journeys/<j>/scenarios/<s>` resolves to the scenario, while
    `/databases/<d>/versions/<v>` falls back to the database — a version is not
    a kind of entity a reference can be attached to.
    """
    if not is_http_url(url):
        return None

    settings = get_settings()
    if (target := _authority(url)) is None or target != _authority(settings.app_url):
        return None

    base_path = urlsplit(settings.app_url).path.rstrip("/")
    path = urlsplit(url).path
    if base_path and not (path == base_path or path.startswith(f"{base_path}/")):
        return None
    segments = [segment for segment in path[len(base_path):].split("/") if segment]

    if len(segments) < 4 or segments[0] != "accounts":
        return None
    try:
        account_id = uuid.UUID(segments[1])
    except ValueError:
        return None

    found: tuple[EntityType, uuid.UUID, int] | None = None
    for index in range(2, len(segments) - 1):
        entity_type = _SEGMENT_TYPES.get(segments[index])
        if entity_type is None:
            continue
        try:
            entity_id = uuid.UUID(segments[index + 1])
        except ValueError:
            continue
        found = (entity_type, entity_id, index + 1)

    if found is None:
        return None
    entity_type, entity_id, last = found
    return InternalTarget(
        account_id=account_id,
        entity_type=entity_type,
        entity_id=entity_id,
        # Truncated at the entity: the tab the author happened to be on when
        # copying the URL is noise, and may not exist for every entity kind.
        path="/" + "/".join(segments[: last + 1]),
    )
