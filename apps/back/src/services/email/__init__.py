"""Transactional email service.

Pluggable by `SERVICE_EMAIL_TYPE`:
- `smtp` — send through the configured SMTP server.
- unset / anything else — no-op: nothing is sent (local dev, bare self-hosting).

Message bodies come from the HTML templates in `templates/` (see `templates.py`).
"""

from src.services.email.service import EmailService

__all__ = ["EmailService"]
