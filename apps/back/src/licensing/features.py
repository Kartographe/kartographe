# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Features a licence can unlock.

Deliberately empty for now. A member is added when the feature it names is
actually built — not before. Naming a feature here that nothing implements
would put a promise in the licence payload that the code cannot keep.

Note the name: `Feature` is already taken by `src/models/feature.py`, an
account-owned business entity (and one of the things quotas count). A licensed
feature is a different animal entirely; the prefix keeps them apart.

When you do add one, remember the rule from `ee/README.md`: **the feature's
code must live in `ee/`.** Listing it here and guarding it from the core makes
it a routing decision, not a boundary — the AGPL lets anyone patch that guard
out, lawfully. What protects a feature is that its code is not in the core at
all, which is what the Elastic License's anti-circumvention clause then covers.

Values are the wire format: they travel in `.lic` payloads and in the
`/v1/accounts/{account_id}/entitlements` response, so they are part of the
public contract. Use dotted, lower-case, stable strings (`"sso.saml"`), and
never rename one — old licences in the wild still carry the old value.
"""

from enum import Enum


class LicensedFeature(str, Enum):
    """A capability a licence may grant. See the module docstring."""
