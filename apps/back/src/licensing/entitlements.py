# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""What an account is entitled to: its edition, its features, its quotas.

`Entitlements` is the answer the rest of the code asks for; it never asks where
the answer came from. In the AGPL core the answer is always Community. When the
Enterprise Edition is installed it registers its own provider (see
`src/licensing/registry.py`), and the answer starts depending on the account's
licence — without a single call site changing.

That indirection is the whole design: the core stays a complete, working
product on its own, and `ee/` plugs into one seam rather than threading
licensing checks through the codebase.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Mapping, Protocol, runtime_checkable

from src.licensing.features import LicensedFeature
from src.licensing.quotas import QuotaKey
from src.models.account import Account

# The Community tier's flat ceilings. These are the values the usage endpoint
# has always reported; they moved here rather than changed, so that switching
# the core over to entitlements is observably a no-op.
COMMUNITY_ENTITY_QUOTA = 1000
COMMUNITY_STORAGE_QUOTA = 1024**3  # 1 GiB per file entity.


class Edition(str, Enum):
    """The edition an account runs under.

    Only Community exists today. Paid editions land with the `.lic` format,
    once there is something to sell and a licence to carry it — naming them
    here first would just be a guess in the wire contract.
    """

    COMMUNITY = "community"


@dataclass(frozen=True, slots=True)
class Entitlements:
    """An account's resolved entitlements.

    Quotas are a default plus per-key overrides rather than a full mapping, so
    a licence can raise one ceiling without restating the other thirty-one, and
    so a new `QuotaKey` is automatically covered instead of silently missing.

    Note `entity_quota` returns a plain `int`: there is no way to express
    "unlimited" yet, because `UsageEntry.limit` is a required `int` in the
    public contract. A licence that wants to grant unlimited will force that
    contract question; it is not answered here.
    """

    edition: Edition
    features: frozenset[LicensedFeature] = frozenset()
    default_entity_quota: int = COMMUNITY_ENTITY_QUOTA
    entity_quotas: Mapping[QuotaKey, int] = field(default_factory=dict)
    default_storage_quota: int = COMMUNITY_STORAGE_QUOTA
    storage_quotas: Mapping[QuotaKey, int] = field(default_factory=dict)

    def allows(self, feature: LicensedFeature) -> bool:
        """Whether the licence unlocks `feature`."""
        return feature in self.features

    def entity_quota(self, key: QuotaKey) -> int:
        """The ceiling on live records of `key`."""
        return self.entity_quotas.get(key, self.default_entity_quota)

    def storage_quota(self, key: QuotaKey) -> int:
        """The ceiling, in bytes, on cumulative storage for the file entity `key`."""
        return self.storage_quotas.get(key, self.default_storage_quota)


COMMUNITY_ENTITLEMENTS = Entitlements(edition=Edition.COMMUNITY)


@runtime_checkable
class EntitlementsProvider(Protocol):
    """Resolves an account's entitlements.

    The core ships exactly one implementation, `CommunityEntitlementsProvider`.
    The Enterprise Edition registers another that reads the account's licence.
    Implementations are called on every request that needs entitlements, so
    they must be cheap: cache, do not re-verify a signature per call.
    """

    def entitlements_for(self, account: Account) -> Entitlements: ...


class CommunityEntitlementsProvider:
    """The AGPL core's provider: everyone gets Community, no licence involved.

    This is not a degraded fallback — it is the free product, and it is what
    every self-hosted install runs unless it installs the Enterprise Edition
    and a licence.
    """

    def entitlements_for(self, account: Account) -> Entitlements:
        return COMMUNITY_ENTITLEMENTS
