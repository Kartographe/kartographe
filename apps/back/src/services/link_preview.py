# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Read a referenced page's title, so the UI can prefill a link's label.

The fetch is triggered by a URL a user types, which makes it a server-side
request forgery surface: without a guard, "https://169.254.169.254/…" would turn
the API into a proxy onto the machine's own network. Every hop is therefore
resolved and checked against the private address space before it is followed,
redirects included.

Best-effort by design — a page that times out, refuses the request or has no
title yields `None`, never an error. Prefilling is a convenience.
"""

import html
import ipaddress
import logging
import re
import socket
from urllib.parse import urlsplit

import httpx

from src.settings import get_settings
from src.utils.links import is_http_url

logger = logging.getLogger("kartographe.links")

# Enough of the document to hold `<head>`; a title that far down is not a title.
_MAX_BYTES = 512 * 1024
_MAX_REDIRECTS = 3
_TITLE = re.compile(rb"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
_OG_TITLE = re.compile(
    rb"""<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']""",
    re.IGNORECASE,
)
_WHITESPACE = re.compile(r"\s+")
# Announcing a browser matters: a fair number of sites serve a bare 403 to an
# unknown agent, and the identifier keeps the request honest about what it is.
_USER_AGENT = "Mozilla/5.0 (compatible; Kartographe link preview; +https://kartographe.app)"


def _is_public(host: str) -> bool:
    """Whether every address `host` resolves to is on the public internet.

    Resolution happens here rather than being left to httpx so the decision is
    made on the addresses that will actually be dialled. A name resolving to
    both a public and a private address is refused outright — the split is a
    classic DNS-rebinding shape, not a reason to gamble on which one wins.
    """
    try:
        infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except (socket.gaierror, UnicodeError):
        return False
    addresses = {info[4][0] for info in infos}
    if not addresses:
        return False
    for address in addresses:
        try:
            ip = ipaddress.ip_address(address)
        except ValueError:
            return False
        if not ip.is_global or ip.is_multicast:
            return False
    return True


def _allowed(url: str) -> bool:
    """Whether this exact URL may be dialled."""
    if not is_http_url(url):
        return False
    host = urlsplit(url).hostname
    if host is None:
        return False
    return get_settings().link_prefill_allow_private_hosts or _is_public(host)


def _extract_title(body: bytes, encoding: str | None) -> str | None:
    """The document's title: `og:title` when present, else `<title>`."""
    match = _OG_TITLE.search(body) or _TITLE.search(body)
    if match is None:
        return None
    raw = match.group(1)
    for candidate in (encoding, "utf-8", "latin-1"):
        if not candidate:
            continue
        try:
            text = raw.decode(candidate)
            break
        except (LookupError, UnicodeDecodeError):
            continue
    else:
        return None
    text = _WHITESPACE.sub(" ", html.unescape(text)).strip()
    return text[:500] or None


def fetch_title(url: str) -> str | None:
    """The title of the page at `url`, or None when it cannot be read.

    Redirects are followed by hand so each hop passes the address guard: httpx's
    own `follow_redirects` would happily walk from a public host onto a private
    one.
    """
    settings = get_settings()
    if not settings.link_prefill_enabled or not _allowed(url):
        return None

    headers = {"User-Agent": _USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
    current = url
    try:
        with httpx.Client(
            timeout=settings.link_prefill_timeout, follow_redirects=False, headers=headers
        ) as client:
            for _ in range(_MAX_REDIRECTS + 1):
                with client.stream("GET", current) as response:
                    if response.is_redirect:
                        location = response.headers.get("location")
                        if not location:
                            return None
                        current = str(response.url.join(location))
                        if not _allowed(current):
                            return None
                        continue
                    if response.status_code >= 400:
                        return None
                    if "html" not in response.headers.get("content-type", "").lower():
                        return None
                    chunks = bytearray()
                    for chunk in response.iter_bytes():
                        chunks.extend(chunk)
                        if len(chunks) >= _MAX_BYTES:
                            break
                    return _extract_title(bytes(chunks[:_MAX_BYTES]), response.encoding)
    except (httpx.HTTPError, ValueError, OSError) as error:
        logger.info("link prefill failed for %s: %s", url, error)
    return None
