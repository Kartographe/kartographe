# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

import pytest

from src.licensing import (
    COMMUNITY_ENTITLEMENTS,
    COMMUNITY_ENTITY_QUOTA,
    COMMUNITY_STORAGE_QUOTA,
    CommunityEntitlementsProvider,
    Edition,
    Entitlements,
    LicensedFeature,
    QuotaKey,
    get_entitlements_provider,
    register_entitlements_provider,
    reset_entitlements_provider,
)
from src.managers.usage import _GROUPS


@pytest.fixture(autouse=True)
def _community_provider():
    """Every test starts on Community and cannot leak a provider into the next."""
    reset_entitlements_provider()
    yield
    reset_entitlements_provider()


# --- The QuotaKey <-> usage contract -------------------------------------
#
# These two run in both directions on purpose. A one-way check would let an
# entity be counted with no ceiling (it escapes its quota), or a ceiling exist
# for something nothing counts (it silently never applies). Both are the kind
# of bug you only notice once a customer is over their limit and billing
# disagrees.

def _quota_keys_in_usage() -> set[QuotaKey]:
    return {key for _, entities in _GROUPS for key, _, _ in entities}


def test_every_counted_entity_has_a_quota_key():
    for key in _quota_keys_in_usage():
        assert isinstance(key, QuotaKey), f"{key!r} in _GROUPS is not a QuotaKey"


def test_every_quota_key_is_counted():
    uncounted = set(QuotaKey) - _quota_keys_in_usage()
    assert not uncounted, f"QuotaKey members nothing counts: {sorted(k.value for k in uncounted)}"


def test_quota_keys_are_not_duplicated_across_groups():
    keys = [key for _, entities in _GROUPS for key, _, _ in entities]
    assert len(keys) == len(set(keys)), "an entity is counted under two typologies"


# --- Community reproduces the previous hard-coded behaviour ---------------

def test_community_quotas_match_the_constants_they_replaced():
    # usage.py carried ENTITY_LIMIT = 1000 and STORAGE_LIMIT = 1 GiB before
    # entitlements existed. Phase 1 moved them; it must not have changed them.
    assert COMMUNITY_ENTITY_QUOTA == 1000
    assert COMMUNITY_STORAGE_QUOTA == 1024**3


def test_community_applies_the_flat_ceiling_to_every_entity():
    for key in QuotaKey:
        assert COMMUNITY_ENTITLEMENTS.entity_quota(key) == COMMUNITY_ENTITY_QUOTA
        assert COMMUNITY_ENTITLEMENTS.storage_quota(key) == COMMUNITY_STORAGE_QUOTA


def test_community_is_the_community_edition_and_unlocks_nothing():
    assert COMMUNITY_ENTITLEMENTS.edition == Edition.COMMUNITY
    assert COMMUNITY_ENTITLEMENTS.features == frozenset()


def test_licensed_feature_is_still_empty():
    # Guards the "do not name a feature before it exists" rule. When this fails,
    # a feature was added: check its code landed in ee/, then delete this test.
    assert list(LicensedFeature) == []


# --- Quota resolution -----------------------------------------------------

def test_an_override_raises_one_ceiling_and_leaves_the_rest_alone():
    entitlements = Entitlements(
        edition=Edition.COMMUNITY,
        entity_quotas={QuotaKey.APPLICATION: 50},
    )
    assert entitlements.entity_quota(QuotaKey.APPLICATION) == 50
    assert entitlements.entity_quota(QuotaKey.DATABASE) == COMMUNITY_ENTITY_QUOTA


def test_a_new_quota_key_falls_back_to_the_default_rather_than_raising():
    # The reason quotas are default-plus-overrides: adding a QuotaKey must not
    # blow up on licences issued before it existed.
    entitlements = Entitlements(edition=Edition.COMMUNITY, default_entity_quota=7)
    assert entitlements.entity_quota(QuotaKey.COMMENT) == 7


def test_storage_overrides_are_independent_of_entity_overrides():
    entitlements = Entitlements(
        edition=Edition.COMMUNITY,
        entity_quotas={QuotaKey.FEATURE_FILE: 10},
        storage_quotas={QuotaKey.FEATURE_FILE: 999},
    )
    assert entitlements.entity_quota(QuotaKey.FEATURE_FILE) == 10
    assert entitlements.storage_quota(QuotaKey.FEATURE_FILE) == 999
    assert entitlements.storage_quota(QuotaKey.JOURNEY_SCENARIO_STEP_FILE) == COMMUNITY_STORAGE_QUOTA


def test_allows_is_false_for_everything_on_community():
    # LicensedFeature is empty, so construct a stand-in rather than skip the case.
    assert not COMMUNITY_ENTITLEMENTS.allows("anything.at.all")


# --- The seam -------------------------------------------------------------

def test_the_core_resolves_to_community_with_no_provider_registered():
    assert isinstance(get_entitlements_provider(), CommunityEntitlementsProvider)
    assert get_entitlements_provider().entitlements_for(None) is COMMUNITY_ENTITLEMENTS


def test_a_registered_provider_takes_over():
    sentinel = Entitlements(edition=Edition.COMMUNITY, default_entity_quota=42)

    class FakeProvider:
        def entitlements_for(self, account):
            return sentinel

    register_entitlements_provider(FakeProvider())
    assert get_entitlements_provider().entitlements_for(None) is sentinel


def test_resetting_drops_back_to_community():
    class FakeProvider:
        def entitlements_for(self, account):
            raise AssertionError("should never be called after reset")

    register_entitlements_provider(FakeProvider())
    reset_entitlements_provider()
    assert isinstance(get_entitlements_provider(), CommunityEntitlementsProvider)


def test_entitlements_are_immutable():
    # The Community instance is a shared module-level singleton handed to every
    # request; a mutable one would let a single account's licence leak into all
    # of them.
    with pytest.raises((AttributeError, TypeError)):
        COMMUNITY_ENTITLEMENTS.edition = "something-else"
