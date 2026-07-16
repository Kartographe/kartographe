# SPDX-FileCopyrightText: 2026 ChallengeMyProject
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Transactional emails for the authentication flow.

Builds the front-end links (against `APP_URL`), renders the matching template
and hands off to `EmailService`. Kept separate from `AuthManager` so business
logic never touches email formatting or delivery.
"""

from src.services.email import EmailService
from src.services.email.templates import (
    RenderedEmail,
    activation_email,
    password_changed_email,
    reset_password_email,
    welcome_email,
)
from src.settings import get_settings


class AuthNotificationManager:
    def __init__(self):
        self._email = EmailService()

    def _link(self, path: str, token: str) -> str:
        base = get_settings().app_url.rstrip("/")
        return f"{base}{path}?token={token}"

    def _send(self, to: str, rendered: RenderedEmail) -> None:
        self._email.send(to=to, email=rendered)

    def activation_link(self, *, email: str, first_name: str | None, token: str) -> None:
        url = self._link("/auth/activation", token)
        self._send(email, activation_email(first_name=first_name, action_url=url))

    def welcome(self, *, email: str, first_name: str | None) -> None:
        self._send(email, welcome_email(first_name=first_name))

    def password_reset_link(self, *, email: str, first_name: str | None, token: str) -> None:
        url = self._link("/auth/reset", token)
        self._send(email, reset_password_email(first_name=first_name, action_url=url))

    def password_changed(self, *, email: str, first_name: str | None) -> None:
        self._send(email, password_changed_email(first_name=first_name))
