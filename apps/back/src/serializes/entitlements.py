# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Account entitlements — the edition it runs under and the features it unlocks.

Quotas are deliberately absent: `/v1/accounts/{account_id}/usage` already
reports every ceiling next to the count it applies to, which is the only place
a ceiling is worth reading. Repeating them here would be a second copy of the
same numbers, free to drift.
"""

from src.licensing import Edition
from src.serializes._base import CamelBase


class EntitlementsItem(CamelBase):
    """What an account is entitled to.

    `features` is a list of `LicensedFeature` values, typed as plain strings
    because that enum is still empty — an empty OpenAPI enum generates an
    unusable `never[]` in the frontend client. It becomes a proper enum once
    the first licensed feature exists.
    """

    edition: Edition
    features: list[str]
