# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""The seam between the AGPL core and the Enterprise Edition.

The core resolves entitlements through whatever provider is registered here.
Nothing registers one, so the core answers Community and is a complete product.
When `ee/` is installed, `app_factory` imports its bootstrap (guarded, the same
way `fastapi-mcp` is), and that bootstrap registers a licence-aware provider.
One seam, one direction: `ee` depends on `src`, never the reverse.

**This registry is AGPL, and that is not an oversight.** Anyone may lawfully
fork the core and register a provider that grants themselves everything — the
AGPL gives them that right, and no code here can take it back. What actually
protects a paid feature is that its code lives in `ee/` under the Elastic
License, whose anti-circumvention clause then applies. So treat this module as
plumbing, not as a lock. `LICENSING.md` sets out the reasoning in full.
"""

import logging

from src.licensing.entitlements import CommunityEntitlementsProvider, EntitlementsProvider

logger = logging.getLogger(__name__)

_COMMUNITY_PROVIDER = CommunityEntitlementsProvider()
_provider: EntitlementsProvider | None = None


def register_entitlements_provider(provider: EntitlementsProvider) -> None:
    """Install `provider` as the source of entitlements, replacing any previous one.

    Called once, at startup, by the Enterprise Edition's bootstrap. Registering
    twice replaces and logs a warning: in-process, that means two bootstraps
    raced, which is a bug worth hearing about rather than a supported mode.
    """
    global _provider
    if _provider is not None:
        logger.warning(
            "Entitlements provider replaced (%s -> %s); expected exactly one registration.",
            type(_provider).__name__,
            type(provider).__name__,
        )
    else:
        logger.info("Entitlements provider registered: %s.", type(provider).__name__)
    _provider = provider


def get_entitlements_provider() -> EntitlementsProvider:
    """The active provider — Community unless the Enterprise Edition registered one."""
    return _provider if _provider is not None else _COMMUNITY_PROVIDER


def reset_entitlements_provider() -> None:
    """Drop back to Community. For tests, so one case cannot leak into the next."""
    global _provider
    _provider = None
