# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Licensing — what an account is entitled to, and who decides.

The public surface of the package. Import from here rather than from the
submodules, so the internal layout stays free to move:

    from src.licensing import Entitlements, QuotaKey

Layout:

- `features.py`     — `LicensedFeature`, what a licence unlocks.
- `quotas.py`       — `QuotaKey`, what a licence caps.
- `entitlements.py` — `Entitlements`, the resolved answer, plus the Community tier.
- `registry.py`     — the single seam the Enterprise Edition plugs into.

Everything here is AGPL and always present. Reading a `.lic` file, checking its
signature and turning it into `Entitlements` is the Enterprise Edition's job
and lives in `ee/`. See `LICENSING.md` for why the split falls exactly there.
"""

from src.licensing.entitlements import (
    COMMUNITY_ENTITLEMENTS,
    COMMUNITY_ENTITY_QUOTA,
    COMMUNITY_STORAGE_QUOTA,
    CommunityEntitlementsProvider,
    Edition,
    Entitlements,
    EntitlementsProvider,
)
from src.licensing.features import LicensedFeature
from src.licensing.quotas import QuotaKey
from src.licensing.registry import (
    get_entitlements_provider,
    register_entitlements_provider,
    reset_entitlements_provider,
)

__all__ = [
    "COMMUNITY_ENTITLEMENTS",
    "COMMUNITY_ENTITY_QUOTA",
    "COMMUNITY_STORAGE_QUOTA",
    "CommunityEntitlementsProvider",
    "Edition",
    "Entitlements",
    "EntitlementsProvider",
    "LicensedFeature",
    "QuotaKey",
    "get_entitlements_provider",
    "register_entitlements_provider",
    "reset_entitlements_provider",
]
