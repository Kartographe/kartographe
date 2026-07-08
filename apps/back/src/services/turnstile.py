"""Cloudflare Turnstile verification."""

import httpx

from src.settings import get_settings


class TurnstileService:
    """Server-side check of a Turnstile token issued in the browser."""

    @staticmethod
    def verify(token: str, *, remote_ip: str | None = None) -> bool:
        settings = get_settings()
        # Disabled → treat every request as human (local dev has no keys).
        if not settings.turnstile_enabled:
            return True
        if not settings.turnstile_secret:
            return False
        payload = {"secret": settings.turnstile_secret, "response": token}
        if remote_ip:
            payload["remoteip"] = remote_ip
        try:
            response = httpx.post(settings.turnstile_verify_url, data=payload, timeout=5.0)
            return bool(response.json().get("success"))
        except (httpx.HTTPError, ValueError):
            return False
