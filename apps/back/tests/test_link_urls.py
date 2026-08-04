# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Guards on how a reference's URL is read.

Two things have to hold. First, the front's route table read backwards
(`parse_internal_url`) must land on the entity the user was looking at — the
deepest recognized pair — and must refuse anything that is not ours, since a
false positive would leak an entity ref onto an unrelated URL. Second, the
prefill fetch must refuse private addresses: it dials a URL a user typed, which
is the definition of an SSRF surface.
"""

import uuid

import pytest

from src.models.enum import EntityType
from src.services import link_preview
from src.settings import get_settings
from src.utils.links import host_of, is_http_url, parse_internal_url

ACCOUNT = uuid.UUID("019813f7-0000-7000-8000-000000000001")
JOURNEY = uuid.UUID("019813f7-0000-7000-8000-000000000002")
SCENARIO = uuid.UUID("019813f7-0000-7000-8000-000000000003")
DATABASE = uuid.UUID("019813f7-0000-7000-8000-000000000004")
VERSION = uuid.UUID("019813f7-0000-7000-8000-000000000005")


@pytest.fixture
def app_url(monkeypatch) -> str:
    """Pin the instance's public front URL, and drop the settings cache."""
    monkeypatch.setenv("APP_URL", "https://karto.example.com")
    get_settings.cache_clear()
    yield "https://karto.example.com"
    get_settings.cache_clear()


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://linear.app/x/issue/ABC-1", True),
        ("http://localhost:5173/accounts", True),
        # A reference is followed from a browser: these never are.
        ("javascript:alert(1)", False),
        ("data:text/html,<h1>hi</h1>", False),
        ("mailto:someone@example.com", False),
        ("file:///etc/passwd", False),
        ("/accounts/1/features/2", False),
        ("https://", False),
        ("", False),
    ],
)
def test_is_http_url(url, expected):
    assert is_http_url(url) is expected


def test_host_of():
    assert host_of("https://Linear.app/x") == "linear.app"
    assert host_of("not a url") is None


def test_resolves_an_entity_of_this_instance(app_url):
    target = parse_internal_url(f"{app_url}/accounts/{ACCOUNT}/journeys/{JOURNEY}")
    assert target is not None
    assert target.account_id == ACCOUNT
    assert target.entity_type == EntityType.JOURNEY
    assert target.entity_id == JOURNEY
    assert target.path == f"/accounts/{ACCOUNT}/journeys/{JOURNEY}"


def test_deepest_pair_wins(app_url):
    target = parse_internal_url(
        f"{app_url}/accounts/{ACCOUNT}/journeys/{JOURNEY}/scenarios/{SCENARIO}"
    )
    assert target is not None
    assert target.entity_type == EntityType.JOURNEY_SCENARIO
    assert target.entity_id == SCENARIO


def test_unknown_deep_segment_falls_back_to_the_last_known_one(app_url):
    # A database version is not a kind a reference can point at — the URL still
    # names its database, which is the useful answer.
    target = parse_internal_url(
        f"{app_url}/accounts/{ACCOUNT}/databases/{DATABASE}/versions/{VERSION}"
    )
    assert target is not None
    assert target.entity_type == EntityType.DATABASE
    assert target.entity_id == DATABASE


def test_tab_segments_are_dropped(app_url):
    # The tab the author happened to be on is noise, and may not exist for
    # every entity kind.
    target = parse_internal_url(f"{app_url}/accounts/{ACCOUNT}/journeys/{JOURNEY}/comments")
    assert target is not None
    assert target.path == f"/accounts/{ACCOUNT}/journeys/{JOURNEY}"


@pytest.mark.parametrize(
    "path",
    [
        "/accounts/{account}",  # the account home names no entity
        "/accounts/{account}/journeys",  # a listing, not an entity
        "/accounts/not-a-uuid/journeys/{journey}",
        "/accounts/{account}/journeys/not-a-uuid",
        "/accounts/{account}/unknown/{journey}",
    ],
)
def test_urls_that_name_no_entity(app_url, path):
    url = app_url + path.format(account=ACCOUNT, journey=JOURNEY)
    assert parse_internal_url(url) is None


@pytest.mark.parametrize(
    "url",
    [
        "https://evil.example.com/accounts/{account}/journeys/{journey}",
        # Same host, different port: a different instance.
        "https://karto.example.com:8443/accounts/{account}/journeys/{journey}",
        "https://karto.example.com.evil.test/accounts/{account}/journeys/{journey}",
    ],
)
def test_other_hosts_are_never_internal(app_url, url):
    assert parse_internal_url(url.format(account=ACCOUNT, journey=JOURNEY)) is None


def test_default_port_is_implicit(monkeypatch):
    monkeypatch.setenv("APP_URL", "http://localhost:5173")
    get_settings.cache_clear()
    try:
        target = parse_internal_url(f"http://localhost:5173/accounts/{ACCOUNT}/journeys/{JOURNEY}")
        assert target is not None
        assert parse_internal_url(f"https://localhost/accounts/{ACCOUNT}/journeys/{JOURNEY}") is None
    finally:
        get_settings.cache_clear()


# --- the prefill fetch ---------------------------------------------------


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1:8000/openapi.json",
        "http://localhost/admin",
        "http://169.254.169.254/latest/meta-data/",  # cloud metadata
        "http://[::1]/",
        "https://10.0.0.5/internal",
        "ftp://example.com/x",
    ],
)
def test_prefill_refuses_what_it_must_not_dial(url, monkeypatch):
    # Nothing may reach the network: a fetch here would be the vulnerability.
    def explode(*args, **kwargs):  # pragma: no cover - only runs on failure
        raise AssertionError(f"link prefill dialled {url}")

    monkeypatch.setattr(link_preview.httpx, "Client", explode)
    assert link_preview.fetch_title(url) is None


def test_prefill_can_be_turned_off(monkeypatch):
    monkeypatch.setenv("LINK_PREFILL_ENABLED", "false")
    get_settings.cache_clear()

    def explode(*args, **kwargs):  # pragma: no cover - only runs on failure
        raise AssertionError("link prefill ran while disabled")

    monkeypatch.setattr(link_preview.httpx, "Client", explode)
    try:
        assert link_preview.fetch_title("https://example.com/") is None
    finally:
        get_settings.cache_clear()


@pytest.mark.parametrize(
    ("body", "expected"),
    [
        (b"<html><head><title>Hello  world</title></head>", "Hello world"),
        (b"<title>Caf&eacute; &amp; th\xc3\xa9</title>", "Café & thé"),
        (b"<title>\n  multi\n  line\n</title>", "multi line"),
        # `og:title` is the page's own idea of its name — better than <title>,
        # which often carries the site's suffix.
        (
            b'<meta property="og:title" content="The real one"><title>The real one | Site</title>',
            "The real one",
        ),
        (b"<html><head></head><body>no title</body></html>", None),
    ],
)
def test_title_extraction(body, expected):
    assert link_preview._extract_title(body, "utf-8") == expected
