# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Google Sign-In: verify an ID token minted for our OAuth client."""

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from src.settings import get_settings


class GoogleService:
    """Validates a Google ID token and extracts the identity it asserts."""

    @staticmethod
    def get_information_from_token(token: str) -> dict | None:
        """Return `{sub, email, first_name, last_name, email_verified}` or None.

        `verify_oauth2_token` checks the signature, expiry and `aud` (our
        client id) and raises `ValueError` on anything invalid.
        """
        settings = get_settings()
        if not settings.google_enabled:
            return None
        try:
            info = id_token.verify_oauth2_token(token, google_requests.Request(), settings.google_client_id)
        except ValueError:
            return None
        return {
            "sub": info.get("sub"),
            "email": info.get("email"),
            "first_name": info.get("given_name"),
            "last_name": info.get("family_name"),
            "email_verified": info.get("email_verified", False),
        }
